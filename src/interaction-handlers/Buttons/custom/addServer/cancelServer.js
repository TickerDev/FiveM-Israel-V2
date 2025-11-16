const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const Discord = require('discord.js');

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
		await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });

		if (!interaction.channel.topic) {
			return interaction.editReply({
				content: 'לא ניתן לבטל כאן - זה לא חדר טיקט.'
			});
		}

		try {
			await interaction.editReply({
				content: 'הפעולה בוטלה. החדר ימחק בעוד כמה שניות...'
			});

			setTimeout(async () => {
				try {
					await interaction.channel.delete();
				} catch (error) {
					console.error('Error deleting channel:', error);
				}
			}, 3000);
		} catch (error) {
			console.error('Error in cancelserver handler:', error);
			return interaction.editReply({
				content: 'אירעה שגיאה בעת ביטול הפעולה.'
			});
		}
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'cancelserver') return this.none();
		return this.some();
	}
}

module.exports = {
	ButtonHandler
};
