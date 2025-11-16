const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const config = require('../../../config');
const { QuickDB } = require('quick.db');
const { client } = require('../../../index');
const { MessageFlags } = require('discord.js');
const Discord = require('discord.js');

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
		const reason = interaction.fields.getTextInputValue('reason');
		try {
			interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
				ViewChannel: false
			});
			interaction.channel.setParent(config.freezeServer);
			await client.db.freezeServer(interaction.channelId, reason);
			interaction.reply({ flags: MessageFlags.Ephemeral, content: 'Server Frooze' });
		} catch (error) {
			interaction.reply({ content: 'It no workie, look console', flags: MessageFlags.Ephemeral });
			this.container.logger.error(error);
		}
	}

	/**
	 * @param {import('discord.js').ModalSubmitInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'givereasonforfreeze') return this.none();
		return this.some();
	}
}

module.exports = {
	ModalHandler
};
