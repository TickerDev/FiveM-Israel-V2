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
		if (interaction.customId !== 'generalqustionsbutton') return this.none();

		return this.some();
	}
	/**
	 *
	 * @param {CommandInteraction} interaction
	 * @returns
	 */
	async run(interaction) {
		// Check if user has an open ticket before showing modal
		const ticketManager = require('../../../custom/tickets');
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
			return interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: `יש לך טיקט פתוח, אנא גש ל ${userOpenedTicket}`
			});
		}

		// If no ticket exists, show the modal
		const Modal = new Discord.ModalBuilder().setCustomId('generalqustionsModal').setTitle('Question');
		const serverDescription = new Discord.TextInputBuilder()
			.setPlaceholder('רשמו פה')
			.setLabel('שאלה:')
			.setCustomId('generalquestionquestion')
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		const serverDescriptionRow = new Discord.ActionRowBuilder().addComponents(serverDescription);

		Modal.addComponents([serverDescriptionRow]);
		await interaction.showModal(Modal);
	}
}
module.exports = {
	TicketAddButtonHandler
};
