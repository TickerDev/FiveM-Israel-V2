const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const { client } = require('../../../index');
const { EmbedBuilder } = require('discord.js');

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

		const amount = interaction.fields.getTextInputValue('namequestion');
		const confirmation = interaction.fields.getTextInputValue('confirmingsecret');
		if (confirmation.toLowerCase() !== 'confirm')
			return interaction.editReply({ content: 'Aborted request because confirmation is wrong.' });

		const server = await client.db.getServer(interaction.channel.id);
		if (!server) {
			return interaction.editReply({ content: 'Server data not found.' });
		}
		await client.db.setServerVotes({
			channelID: interaction.channel.id,
			number: amount
		});
		const message = await interaction.channel.messages.fetch(server.messageId);
		const embed = new EmbedBuilder(message.embeds[0]);
		const votesField = embed.data.fields.find((field) => field.name?.toLowerCase().includes('votes'));

		if (votesField) {
			if (embed.data.fields.filter((field) => field.name?.toLowerCase().includes('votes')).length > 1) {
				embed.data.fields = embed.data.fields.filter((field) => !field.name?.toLowerCase().includes('votes'));

				embed.addField('Votes', server ? Number.parseInt(amount).toString() : '1');
			} else votesField.value = Number.parseInt(amount).toString();
		} else embed.addField('Votes', server ? Number.parseInt(amount).toString() : '1');

		await message.edit({ embeds: [embed] });
		return interaction.editReply({ content: 'Success!' });
	}

	/**
	 * @param {import('discord.js').ModalSubmitInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'votessecretmenu') return this.none();

		return this.some();
	}
}

module.exports = {
	ModalHandler
};
