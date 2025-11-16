const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const {
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	LabelBuilder,
	EmbedBuilder,
	ButtonStyle,
	Colors,
	ButtonBuilder,
	MessageFlags
} = require('discord.js');
const { prisma } = require('../prisma');
const { Time } = require('@sapphire/time-utilities');

class ButtonHandler extends InteractionHandler {
	/**
	 * @param {InteractionHandler.LoaderContext} context
	 * @param {InteractionHandler.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	async run(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const blacklistRequest = await prisma.blacklistRequests.findUnique({
			where: {
				id: interaction.message.embeds[0].footer.text
			}
		});
		if (!blacklistRequest) {
			return interaction.editReply({ content: 'הבלאקליסט לא נמצא', flags: MessageFlags.Ephemeral });
		}
		const blacklistingUser = await this.container.client.users.fetch(blacklistRequest.userId).catch(() => null);
		if (!blacklistingUser) {
			return interaction.editReply({ content: 'המשתמש לא נמצא', flags: MessageFlags.Ephemeral });
		}
		const blacklistedUser = await this.container.client.users.fetch(blacklistRequest.blacklistedUserId).catch(() => null);
		if (!blacklistedUser) {
			return interaction.editReply({ content: 'המשתמש לא נמצא', flags: MessageFlags.Ephemeral });
		}
		const deniedModal = new ModalBuilder().setCustomId('deniedModal').setTitle('דחה בלאקליסט');

		const label = new LabelBuilder()
			.setLabel('סיבה לדחייה')
			.setTextInputComponent(new TextInputBuilder().setCustomId('deniedReason').setStyle(TextInputStyle.Paragraph).setRequired(true));
		deniedModal.addLabelComponents(label);
		await interaction.showModal(deniedModal);

		const filter = (modalInteraction) => modalInteraction.customId === 'deniedModal';
		await interaction
			.awaitModalSubmit({ filter, time: Time.Minute * 5 })
			.then(async (modalInteraction) => {
				await modalInteraction.deferReply({ flags: MessageFlags.Ephemeral });
				const deniedReason = modalInteraction.fields.getTextInputValue('deniedReason');
				if (!deniedReason) {
					return modalInteraction.editReply({ content: 'אינך יכול לדחות בלאקליסט מבלי לציין סיבה', flags: MessageFlags.Ephemeral });
				}

				const deniedEmbed = new EmbedBuilder()
					.setColor(Colors.Red)
					.setTitle('בלאקליסט נדחה')
					.setDescription(`בלאקליסט נדחה על ידי <@${interaction.user.id}>.`)
					.addFields(
						{
							name: 'סיבה',
							value: deniedReason
						},
						{
							name: 'למי היה הבלאקליסט?',
							value: `<@${blacklistRequest.blacklistedUserId}> (${blacklistRequest.blacklistedUserId})`
						},
						{
							name: 'הוכחות',
							value: blacklistRequest.evidence
						}
					)
					.setFooter({ text: `${blacklistRequest.id}`, iconURL: interaction.guild.iconURL() });
				await interaction.message.edit({ embeds: [deniedEmbed], components: [] });
				try {
					await blacklistingUser.send({
						embeds: [
							new EmbedBuilder()
								.setColor(Colors.Red)
								.setTitle('בלאקליסט נדחה')
								.setDescription(
									`בקשת הבלאקליסט שלך על ${blacklistedUser.user ? blacklistedUser.user.username : blacklistedUser.username} נדחתה.`
								)
								.addFields({
									name: 'סיבה',
									value: deniedReason
								})
								.setFooter({ text: `${blacklistRequest.id}`, iconURL: interaction.guild.iconURL() })
						],
						components: [
							new ActionRowBuilder().addComponents(
								new ButtonBuilder().setCustomId('dm_delete').setLabel('מחק הודעה').setStyle(ButtonStyle.Secondary)
							)
						]
					});
				} catch (error) {
					console.error(error);
				}
				await modalInteraction.editReply({ content: 'בלאקליסט נדחה בהצלחה', flags: MessageFlags.Ephemeral });
			})
			.catch((error) => {
				console.error(error);
			});
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'declineblacklist') return this.none();
		return this.some();
	}
}

module.exports = {
	ButtonHandler
};
