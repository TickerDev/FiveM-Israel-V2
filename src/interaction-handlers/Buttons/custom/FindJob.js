const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const { TextInputStyle, CommandInteraction } = require('discord.js');
const Discord = require('discord.js');
class TicketAddButtonHandler extends InteractionHandler {
	constructor(ctx, options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	parse(interaction) {
		if (interaction.customId !== 'wanted') return this.none();

		return this.some();
	}
	/**
	 *
	 * @param {CommandInteraction} interaction
	 * @returns
	 */
	async run(interaction) {
		const Modal = new Discord.ModalBuilder().setCustomId('wantedModal').setTitle('דרוש');
		const serverDescription = new Discord.TextInputBuilder()
			.setPlaceholder('רשמו פה')
			.setLabel('פירוט:')
			.setCustomId('explainfurtherwanted')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(true)
			.setMaxLength(250);
		const priceDescription = new Discord.TextInputBuilder()
			.setPlaceholder('פרט על התקציב שלך פה')
			.setLabel('אנא הביא תקציב')
			.setCustomId('pricedescription')
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMaxLength(250);
		const serverDescriptionRow = new Discord.ActionRowBuilder().addComponents(serverDescription);
		const priceDescriptionRow = new Discord.ActionRowBuilder().addComponents(priceDescription);

		Modal.addComponents([serverDescriptionRow, priceDescriptionRow]);
		await interaction.showModal(Modal);
	}
}
module.exports = {
	TicketAddButtonHandler
};
