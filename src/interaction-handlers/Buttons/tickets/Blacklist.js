const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const config = require('../../../config');
const {
	Client,
	GatewayIntentBits,
	UserSelectMenuBuilder,
	Collection,
	ApplicationCommandOptionType,
	ActivityType,
	EmbedBuilder,
	PermissionsBitField,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	ChannelType,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	CommandInteraction,
	MessageFlags
} = require('discord.js');
const Discord = require('discord.js');
class TicketAddButtonHandler extends InteractionHandler {
	constructor(ctx, options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	parse(interaction) {
		if (interaction.customId !== 'suggestblacklistbutton') return this.none();

		return this.some();
	}
	/**
	 *
	 * @param {CommandInteraction} interaction
	 * @returns
	 */
	async run(interaction) {
		const modal = new Discord.ModalBuilder().setCustomId('blacklistModal').setTitle('הגשת בלאקליסט');
		const userLabel = new Discord.LabelBuilder()
			.setLabel('בחר משתמש שאתה רוצה להגיש עליו בלאקליסט')

			.setUserSelectMenuComponent(
				new Discord.UserSelectMenuBuilder()
					.setCustomId('blacklistedMember')
					.setRequired(false)
					.setPlaceholder('בחר משתמש פה')
					.setMinValues(1)
					.setMaxValues(1)
			);
		const userLabelId = new Discord.LabelBuilder()
			.setLabel('המשתמש לא בשרת? שימו את האיידי שלו פה')

			.setTextInputComponent(
				new Discord.TextInputBuilder()
					.setCustomId('blacklistedUserId')
					.setStyle(Discord.TextInputStyle.Short)
					.setRequired(false)
					.setPlaceholder('רק אם לא עובד לכם רגיל')
			);
		const evidenceUpload = new Discord.LabelBuilder()
			.setLabel('שלחו עד 5 הוכחות (אך ורק תמונות)')

			.setFileUploadComponent(
				new Discord.FileUploadBuilder().setCustomId('blacklistEvidenceUpload').setMinValues(1).setMaxValues(5).setRequired(true)
			);
		const selectExplain = new Discord.LabelBuilder()
			.setLabel('בחר סיבה בנויה מראש')
			.setStringSelectMenuComponent(
				new Discord.StringSelectMenuBuilder()
					.setCustomId('reasonBuilt')
					.setPlaceholder('בחרו סיבה')
					.addOptions(
						new Discord.StringSelectMenuOptionBuilder()
							.setLabel('ניוק')
							.setDescription('הרס לי את השרת בעזרת בוט או ידני, הכולל מחיקת חדרים, רולים, באנים לכל המשתמשים, וכו')
							.setValue('nuke'),
						new Discord.StringSelectMenuOptionBuilder()
							.setLabel("צ'יטים")
							.setDescription("המשתמש עשה לי צ'יטים בשרת שלי, ההוכחות מראות צילומים משיתופי מסך, אנטי צ'יטים, וכו")
							.setValue('cheating'),
						new Discord.StringSelectMenuOptionBuilder()
							.setLabel('הדלפות מוצרים')
							.setDescription('המשתמש הדליף יצירה שלי, ופרסם אותה ללא אישורי')
							.setValue('leaking'),
						new Discord.StringSelectMenuOptionBuilder()
							.setLabel('הפצת פרטים אישיים')
							.setDescription('המשתמש הפיץ פרטים אישיים שלי, ללא רשותי והסכמתי')
							.setValue('doxing'),
						new Discord.StringSelectMenuOptionBuilder()
							.setLabel('אחר')
							.setDescription('אם אף אחת מהאפשרויות אינה הסיבה, בחר את אופציה זאת וההרחב בתיבת הטקסט למטה')
							.setValue('other')
					)
			);
		const explain = new Discord.LabelBuilder()
			.setLabel('הרחיבו פה על הסיבה')

			.setTextInputComponent(
				new Discord.TextInputBuilder()
					.setCustomId('explainfurther')
					.setStyle(Discord.TextInputStyle.Paragraph)
					.setRequired(false)
					.setPlaceholder('רק אם לא עובד לכם רגיל')
			);
		modal.addLabelComponents(userLabel, userLabelId, selectExplain, explain, evidenceUpload);
		interaction.showModal(modal);
	}
}
module.exports = {
	TicketAddButtonHandler
};
