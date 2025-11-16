const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { prisma } = require('../prisma');
class ModalHandler extends InteractionHandler {
	/**
	 * @param {InteractionHandler.LoaderContext} context
	 * @param {InteractionHandler.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.ModalSubmit
		});
	}

	/**
	 * @param {import('discord.js').ModalSubmitInteraction} interaction
	 */
	async run(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const blacklistedMember = interaction.fields.getSelectedMembers('blacklistedMember', false);
		if (blacklistedMember && blacklistedMember.size > 0 && blacklistedMember.at(0).user.bot) {
			return interaction.editReply({
				content: 'ברו זה בוט... יא מוזר',
				flags: MessageFlags.Ephemeral
			});
		}
		const userid = interaction.fields.getTextInputValue('blacklistedUserId', false);
		const reason = interaction.fields.getStringSelectValues('reasonBuilt', false);
		const explainfurther = interaction.fields.getTextInputValue('explainfurther', false);
		const evidenceUpload = interaction.fields.getUploadedFiles('blacklistEvidenceUpload', true);
		const AllowedContents = ['image/png', 'image/gif', 'image/jpg', 'image/jpeg'];
		evidenceUpload.forEach((file) => {
			if (!AllowedContents.includes(file.contentType)) {
				return interaction.editReply({
					content: 'נכון לכרגע אנחנו מקבלים רק את הקבצים הבאים:\n```\n.png\n.jpg\n.jpeg\n.gif```',
					flags: MessageFlags.Ephemeral
				});
			}
		});
		let memberToBlacklist = null;
		if (blacklistedMember && blacklistedMember.size > 0) {
			memberToBlacklist = blacklistedMember.at(0);
		} else if (userid) {
			console.log('here', await this.container.client.users.fetch(userid).catch(() => null));
			memberToBlacklist = await this.container.client.users.fetch(userid).catch(async (error) => {
				console.log('error', error);
				return null;
			});
		} else {
			return interaction.editReply({
				content: 'לא הבאת משתמש לבלאקליסט או משתמש זה לא קיים',
				flags: MessageFlags.Ephemeral
			});
		}
		const reasonTranslation = {
			nuke: 'ניוק',
			cheating: "צ'יטים",
			leaking: 'הדלפות מוצרים',
			doxing: 'הפצת פרטים אישיים',
			other: 'אחר'
		};
		const blacklistRequest = await prisma.blacklistRequests.create({
			data: {
				userId: interaction.user.id,
				reason: reason,
				blacklistedUserId: memberToBlacklist.id,
				evidence: evidenceUpload.map((file) => file.url).join('\n'),
				additionalInfo: explainfurther,
				createdAt: new Date()
			}
		});
		if (!blacklistRequest) {
			return interaction.editReply({
				content: 'אירעה שגיאה בעת יצירת הבלאקליסט',
				flags: MessageFlags.Ephemeral
			});
		}
		console.log('memberToBlacklist', memberToBlacklist);
		const message = new EmbedBuilder()
			.setColor(config.embed_color)
			.setTitle('בקשת בלאקליסט חדשה')
			.setThumbnail(memberToBlacklist.displayAvatarURL())
			.addFields(
				{
					name: 'משתמש לבלאקליסט',
					value: `<@${memberToBlacklist.id}> (${memberToBlacklist.user ? memberToBlacklist.user.username : memberToBlacklist.username})`
				},
				{ name: 'איידי של משתמש לבלאקליסט', value: memberToBlacklist.id },
				{ name: 'סיבה לבלאקליסט', value: reason.map((r) => reasonTranslation[r]).join(', ') },
				{ name: 'הסבר נוסף', value: explainfurther },
				{ name: 'הוכחות', value: evidenceUpload.map((file) => `[הוכחה](${file.url})`).join('\n') }
			)
			.setFooter({ text: `${blacklistRequest.id}`, iconURL: interaction.guild.iconURL() });
		const blacklistReqChannel = interaction.guild.channels.cache.get(config.blacklistsreq);
		if (!blacklistReqChannel) {
			return interaction.editReply({
				content: 'לא הצלחנו למצוא את החדר של הבלאקליסטים',
				flags: MessageFlags.Ephemeral
			});
		}

		if (!blacklistRequest) {
			return interaction.editReply({
				content: 'אירעה שגיאה בעת יצירת הבלאקליסט',
				flags: MessageFlags.Ephemeral
			});
		}
		blacklistReqChannel.send({
			embeds: [message],
			components: [
				new ActionRowBuilder().addComponents(
					new ButtonBuilder().setCustomId('acceptblacklist').setLabel('אשר בלאקליסט').setStyle(ButtonStyle.Success),
					new ButtonBuilder().setCustomId('declineblacklist').setLabel('דחה בלאקליסט').setStyle(ButtonStyle.Danger)
				)
			]
		});
		interaction.editReply({
			content: 'בקשת הבלאקליסט נשלחה בהצלחה',
			flags: [MessageFlags.Ephemeral]
		});
		try {
			await interaction.user.send({
				embeds: [
					new EmbedBuilder()
						.setColor(config.embed_color)
						.setTitle('בקשת בלאקליסט חדשה')
						.setDescription(
							'בקשת הבלאקליסט נשלחה בהצלחה, אנחנו נעדכן אותך במצבה בפרטי\nהצוות לא יודע מי שלח את בקשת הבלאקליסט על מנת לשמור על דיסקרטיות.'
						)
						.setFields({
							name: 'מזהה הבלאקליסט',
							value: `\`${blacklistRequest.id}\` - אם תרצה לציין את הבלאקליסט בעתיד, שמור מזהה זה`
						})
						.setFooter({ text: 'על מנת למחוק הודעה זאת, לחץ על הכפתור', iconURL: interaction.guild.iconURL() })
				],
				components: [
					new ActionRowBuilder().addComponents(
						new ButtonBuilder().setCustomId('dm_delete').setLabel('מחק הודעה').setStyle(ButtonStyle.Secondary)
					)
				]
			});
		} catch (error) {
			interaction.followUp({
				content: 'הדיאמס שלך סגורים, אנא פתח אותם כדי לקבל עדכונים'
			});
		}
	}

	/**
	 * @param {import('discord.js').ModalSubmitInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'blacklistModal') return this.none();

		return this.some();
	}
}

module.exports = {
	ModalHandler
};
