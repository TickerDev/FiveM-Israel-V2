const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const { MessageFlags } = require('discord.js');
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

	isDiscordInvite(link) {
		const discordInviteRegex = /^(https?:\/\/)?(www\.)?(discord\.com\/invite\/|discord\.gg\/)([a-zA-Z0-9-]+)$/;
		return discordInviteRegex.test(link);
	}

	async run(interaction) {
		const modal = new Discord.ModalBuilder()
			.setCustomId('serverlink')
			.setTitle('שנה קישור לשרת')
			.setComponents([
				new Discord.ActionRowBuilder().setComponents([
					new Discord.TextInputBuilder()
						.setCustomId('link')
						.setLabel('קישור לשרת')
						.setPlaceholder('קישור פה')
						.setStyle(Discord.TextInputStyle.Short)
						.setRequired(true)
				])
			]);

		await interaction.showModal(modal);

		try {
			const i = await interaction.awaitModalSubmit({
				time: 30_000,
				filter: (x) => x.customId == 'serverlink' && x.user.id == interaction.user.id
			});

			await i.deferReply({ flags: MessageFlags.Ephemeral });
			let link = i.fields.getTextInputValue('link');

			if (!this.isDiscordInvite(link)) {
				return i.editReply({
					content: 'המממ, זה לא נראה קישור לשרת דיסקורד. אנא נסה שוב.'
				});
			}

			if (!link.startsWith('https://')) link = 'https://' + link;

			const components = JSON.parse(JSON.stringify(interaction.message.components));

			for (const container of components) {
				for (const section of container.components ?? []) {
					if (section.type === Discord.ComponentType.ActionRow) {
						for (const component of section.components ?? []) {
							if (
								component.type === Discord.ComponentType.Button &&
								component.style === Discord.ButtonStyle.Link &&
								component.label === 'Join Here'
							) {
								component.url = link;
							}
						}
					}
				}
			}

			await interaction.message.edit({
				components: components
			});

			await i.editReply({ content: 'קישור שונה', flags: MessageFlags.Ephemeral });
		} catch (err) {
			console.error('Error in setserverlink:', err);
		}
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'setserverlink') return this.none();
		return this.some();
	}
}

module.exports = {
	ButtonHandler
};
