const { Command } = require('@sapphire/framework');
const { Time } = require('@sapphire/time-utilities');
const {
	ApplicationCommandType,
	MessageFlags,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	FileUploadBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	LabelBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	EmbedBuilder
} = require('discord.js');
const { FeedbackType } = require('@prisma/client');
const { prisma } = require('../prisma');
const config = require('../config');
class UserCommand extends Command {
	/**
	 * @param {Command.LoaderContext} context
	 */
	constructor(context) {
		super(context, {
			// Any Command options you want here
			name: 'תנו חוות דעת על משתמש',
			description: '[TRUST-SCORE] תנו חוות דעת על משתמש'
		});
	}

	/**
	 * @param {Command.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerContextMenuCommand((builder) =>
			builder //
				.setName(this.name)
				.setType(ApplicationCommandType.User)
		);
	}

	/**
	 * @param {Command.ContextMenuCommandInteraction} interaction
	 */
	async contextMenuRun(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const reviewChannel = interaction.guild.channels.cache.get(config.feedbacks.reviewChannel);
		if (!reviewChannel) {
			return interaction.editReply({ content: 'לא הצלחנו למצוא את החדר של החוות דעת', components: [] });
		}
		const guildMember = await interaction.guild.members.fetch(interaction.targetId);
		if (!guildMember) {
			return interaction.editReply({ content: 'משתמש זה אינו נמצא בשרת' });
		}
		await interaction.editReply({
			content: `אתם הולכים להביא חוות דעת על משתמש ${guildMember.user.username} (<@${interaction.targetId}>)\nצוות השרת יוכל לראות את הפרטים הבאים:\n	
\`\`\`
המשתמש דיסקורד שלכם
הניקוד אמינות הנוכחי שלכם ושל המשתמש
החוות דעת שלכם
\`\`\`
הטרלה בחוות דעת תוביל לענישה, היכולה להוריד ברמת אמינות שלכם.
אם ברצונכם להמשיך, יש להקיש כפתור "המשך" למטה.
-# יש לכם שלושים שניות לאשר`,
			components: [
				new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('reviewSomeone').setLabel('המשך').setStyle(ButtonStyle.Success))
			]
		});
		const collector = interaction.channel.createMessageComponentCollector({ filter: (i) => i.customId === 'reviewSomeone', time: 30000 });
		collector.on('collect', async (i) => {
			await interaction.editReply({ content: 'טוען טופס', components: [] });
			const modal = new ModalBuilder()
				.setCustomId('reviewSomeoneModal')
				.setTitle(this.fixHebrewRTL(`${this.fixHebrewRTL(guildMember.user.username)} חוות דעת על `));
			const selectLabel = new LabelBuilder()
				.setLabel('בחרו את החוויה שלכם')
				.setStringSelectMenuComponent(
					new StringSelectMenuBuilder()
						.setCustomId('reviewType')
						.setPlaceholder('בחרו את החוויה שלכם')
						.addOptions(
							new StringSelectMenuOptionBuilder().setLabel('חיובית').setValue('positive').setDescription('החוות דעת שלכם היא חיובית'),
							new StringSelectMenuOptionBuilder().setLabel('שלילית').setValue('negative').setDescription('החוות דעת שלכם היא שלילית')
						)
				);
			const label = new LabelBuilder()
				.setLabel('החוות דעת שלכם')
				.setTextInputComponent(
					new TextInputBuilder()
						.setCustomId('reviewText')
						.setPlaceholder('תתארו את החוויה שלכם בצורה הכי מפורטת שתוכלו')
						.setStyle(TextInputStyle.Paragraph)
						.setRequired(true)
				);
			const evidenceUpload = new LabelBuilder()
				.setLabel('העלו הוכחת שירות (תמונות בלבד)')
				.setFileUploadComponent(new FileUploadBuilder().setCustomId('evidenceUpload').setRequired(true).setMinValues(1).setMaxValues(5));
			modal.addLabelComponents(selectLabel, label, evidenceUpload);
			await i.showModal(modal);
			await i
				.awaitModalSubmit({ filter: (m) => m.customId === 'reviewSomeoneModal', time: Time.Minute * 10 })
				.then(async (modalInteraction) => {
					await modalInteraction.deferReply({ flags: MessageFlags.Ephemeral });
					const reviewType = modalInteraction.fields.getStringSelectValues('reviewType');
					const reviewText = modalInteraction.fields.getTextInputValue('reviewText');
					const evidenceUpload = modalInteraction.fields.getUploadedFiles('evidenceUpload');
					console.log(reviewType, reviewText, evidenceUpload);
					await prisma.users.upsert({
						where: { id: interaction.user.id },
						update: {},
						create: { id: interaction.user.id }
					});
					await prisma.users.upsert({
						where: { id: guildMember.id },
						update: {},
						create: { id: guildMember.id }
					});
					const feedback = await prisma.feedbacks.create({
						data: {
							feedbackerID: interaction.user.id,
							feedbackedUserID: guildMember.id,
							feedbackType: reviewType[0] === 'positive' ? FeedbackType.POSITIVE : FeedbackType.NEGATIVE,
							additionalInfo: reviewText,
							evidence: evidenceUpload.map((file) => file.url)
						}
					});
					const reviewEmbed = new EmbedBuilder()
						.setColor(config.embed_color)
						.setTitle(`חוות דעת על ${guildMember.user.username} (${guildMember.displayName})`)
						.setDescription(
							`המשתמש סימן את חוות הדעת הזאתי: ${reviewType[0] === 'positive' ? 'חיובית' : 'שלילית'}\n\nמלל החוות דעת:\n${reviewText}`
						)
						.setFields(
							{
								name: 'מביא חוות הדעת',
								value: `<@${interaction.user.id}> (${interaction.user.username})`
							},
							{
								name: 'משתמש שהוא מביא חוות הדעת',
								value: `<@${guildMember.id}> (${guildMember.user.username})`
							},
							{
								name: 'הוכחות',
								value: evidenceUpload.map((file) => `[הוכחה](${file.url})`).join('\n')
							},
							{
								name: 'שימו לב',
								value: 'צוות יקר, עליכם האחריות לתת החלטה על החוות דעת זו, זה לוקח שני חברי צוות כדי לתת החלטה סופית.'
							}
						)
						.setThumbnail(guildMember.displayAvatarURL())
						.setFooter({
							text: `${feedback.id}`,
							iconURL: interaction.user.displayAvatarURL()
						});
					await reviewChannel.send({
						embeds: [reviewEmbed],
						components: [
							new ActionRowBuilder().setComponents(
								new StringSelectMenuBuilder()
									.setCustomId('reviewApproval')
									.setPlaceholder('בחרו את החלטה שלכם')
									.addOptions(
										new StringSelectMenuOptionBuilder().setLabel('אישור').setValue('approve').setDescription('אישור החוות דעת'),
										new StringSelectMenuOptionBuilder().setLabel('דחייה').setValue('reject').setDescription('דחייה של החוות דעת')
									)
							)
						]
					});
					await interaction.editReply({ content: 'חוות דעת נשלחה בהצלחה', components: [] });
				});
		});
	}
	fixHebrewRTL(text) {
		return `\u202A${text}\u202C`;
	}
}

module.exports = {
	UserCommand
};
