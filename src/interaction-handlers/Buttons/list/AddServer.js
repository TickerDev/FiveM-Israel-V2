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
	StringSelectMenuOptionBuilder,
	MessageFlags
} = require('discord.js');
const Discord = require('discord.js');
const { client } = require('../../../index');
const ticketManager = require('../../../custom/tickets');

class TicketAddButtonHandler extends InteractionHandler {
	constructor(ctx, options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	parse(interaction) {
		if (interaction.customId !== 'addserverbutton') return this.none();

		return this.some();
	}
	/**
	 *
	 * @param {CommandInteraction} interaction
	 * @returns
	 */
	async run(interaction) {
		// Check if user has an open ticket before showing category selection
		const ticket = new ticketManager({
			client: this.container.client,
			userId: interaction.user.id,
			staffId: config.staffRole,
			type: 'server',
			logs: config.logChannel,
			guildId: interaction.guild.id
		});
		const userOpenedTicket = await ticket.hasTicketOpen;
		if (userOpenedTicket) {
			return interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: `יש לך טיקט פתוח, אנא גש ל ${userOpenedTicket}`
			});
		}

		// If no ticket exists, show the category selection
		const select = new StringSelectMenuBuilder()
			.setCustomId('choosecategory')
			.setPlaceholder('בחר קטגוריה')
			.setMaxValues(1)
			.addOptions(
				new StringSelectMenuOptionBuilder().setLabel('Whitelist').setDescription('שרת וויטליסט').setValue('whitelist'),
				new StringSelectMenuOptionBuilder().setLabel('Allowlist').setDescription('שרת אלווליסט').setValue('allowlist'),
				new StringSelectMenuOptionBuilder().setLabel('Public').setDescription('שרת פאבליק').setValue('public'),
				new StringSelectMenuOptionBuilder().setLabel('Fun').setDescription('שרת לכיף (DM, קהילות וכולי)').setValue('fun'),
				new StringSelectMenuOptionBuilder().setLabel('Shop').setDescription('שרת של חנות').setValue('shop'),
				new StringSelectMenuOptionBuilder().setLabel('Hosting').setDescription('שרת של חברת אחסון').setValue('hosting')
			);

		interaction.reply({
			content: '**אוקיי! בוא נתחיל בעיצוב השרת שלך ברשימה בעזרת מערכת יצירת השרתים שלו!**\nאנא בחר את הקטגוריה הרצויה לך מהאפשרויות למטה',
			components: [new ActionRowBuilder().addComponents(select)],
			flags: MessageFlags.Ephemeral
		});
	}
}
module.exports = {
	TicketAddButtonHandler
};
