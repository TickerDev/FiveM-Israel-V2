const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');

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
		if (!interaction.channel.isDMBased()) return;
		interaction.message.delete();
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'dm_delete') return this.none();
		return this.some();
	}
}

module.exports = {
	ButtonHandler
};
