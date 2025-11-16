const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const { MessageFlags } = require('discord.js');
const Discord = require('discord.js');

class ButtonHandler extends InteractionHandler {
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
		const modal = new Discord.ModalBuilder()
			.setCustomId('servername')
			.setTitle('שנה שם לשרת')
			.setComponents([
				new Discord.ActionRowBuilder().setComponents(
					new Discord.TextInputBuilder()
						.setCustomId('name')
						.setLabel('שם השרת')
						.setPlaceholder('שם פה')
						.setStyle(Discord.TextInputStyle.Short)
						.setMaxLength(100)
						.setRequired(true)
				)
			]);

		await interaction.showModal(modal);

		try {
			const i = await interaction.awaitModalSubmit({
				time: 30_000,
				filter: (x) => x.customId === 'servername' && x.user.id === interaction.user.id
			});

			await i.deferReply({ flags: MessageFlags.Ephemeral });
			const name = i.fields.getTextInputValue('name').trim().slice(0, 100);

			const components = interaction.message.components ? JSON.parse(JSON.stringify(interaction.message.components)) : [];

			let replaced = false;
			for (const container of components) {
				if (container.type === Discord.ComponentType.Container) {
					for (const section of container.components ?? []) {
						if (section.type === Discord.ComponentType.Section) {
							for (const text of section.components ?? []) {
								if (
									text.type === Discord.ComponentType.TextDisplay &&
									typeof text.content === 'string' &&
									text.content.startsWith('# ')
								) {
									text.content = `# ${name}`;
									replaced = true;
									break;
								}
							}
						}
						if (replaced) break;
					}
				}
				if (replaced) break;
			}

			if (!replaced) {
				await i.editReply({
					content: 'לא מצאתי את שם השרת בהודעה — לא שיניתי כלום.',
					flags: MessageFlags.Ephemeral
				});
				return;
			}

			await interaction.message.edit({
				flags: Discord.MessageFlags.IsComponentsV2,
				components
			});

			await i.editReply({ content: 'שם השרת שונה.', flags: MessageFlags.Ephemeral });
		} catch (err) {
			console.error('Error editing server name:', err);
		}
	}

	parse(interaction) {
		return interaction.customId === 'setservername' ? this.some() : this.none();
	}
}

module.exports = { ButtonHandler };
