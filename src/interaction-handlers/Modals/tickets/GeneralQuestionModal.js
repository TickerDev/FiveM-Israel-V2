const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const config = require('../../../config');
const { QuickDB } = require('quick.db');
const db = new QuickDB({ table: 'tickets' });
const Discord = require('discord.js');
const ticketManager = require('../../../custom/tickets');
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
		await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });

		const ticket = new ticketManager({
			client: this.container.client,
			userId: interaction.user.id,
			staffId: config.staffRole,
			type: 'general',
			logs: config.logChannel,
			guildId: interaction.guild.id
		});

		const userOpenedTicket = await ticket.hasTicketOpen;
		if (userOpenedTicket) {
			return interaction.editReply({
				content: `יש לך טיקט פתוח, אנא גש ל ${userOpenedTicket}`
			});
		}

		const reason = interaction.fields.getTextInputValue('generalquestionquestion');
		const channel = await ticket.createTicket(reason);

		if (!channel) {
			return interaction.editReply({
				content: `${config.emojis.x} משהו לא צלח! אנא נסה שוב מאוחר יותר`
			});
		}

		interaction.editReply({
			content: `${config.emojis.checkmark} טיקט נפתח\n${channel}`
		});
	}
	/**
	 * @param {import('discord.js').ModalSubmitInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'generalqustionsModal') return this.none();

		return this.some();
	}
}
module.exports = {
	ModalHandler
};
