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
			.setCustomId('serverdescription')
			.setTitle('שנה תיאור לשרת')
			.addComponents(
				new Discord.ActionRowBuilder().addComponents(
					new Discord.TextInputBuilder()
						.setCustomId('description')
						.setLabel('תאר את השרת')
						.setPlaceholder('תיאור פה')
						.setStyle(Discord.TextInputStyle.Paragraph)
						.setMaxLength(1000)
						.setRequired(true)
				)
			);

		await interaction.showModal(modal);

		try {
			const i = await interaction.awaitModalSubmit({
				time: 30_000,
				filter: (x) => x.customId === 'serverdescription' && x.user.id === interaction.user.id
			});

			await i.deferReply({ flags: MessageFlags.Ephemeral });
			const description = i.fields.getTextInputValue('description').trim().slice(0, 1000);

			const components = interaction.message.components ? JSON.parse(JSON.stringify(interaction.message.components)) : [];

			let titleFound = false;
			let replaced = false;

			for (const container of components) {
				if (container.type === Discord.ComponentType.Container) {
					for (const section of container.components ?? []) {
						if (section.type === Discord.ComponentType.Section) {
							for (const text of section.components ?? []) {
								if (text.type === Discord.ComponentType.TextDisplay && typeof text.content === 'string') {
									if (text.content.startsWith('# ')) {
										titleFound = true;
									} else if (titleFound && !replaced) {
										text.content = description;
										replaced = true;
										break;
									}
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
					content: 'לא מצאתי תיאור לשנות בהודעה.',
					flags: MessageFlags.Ephemeral
				});
				return;
			}

			await interaction.message.edit({
				flags: Discord.MessageFlags.IsComponentsV2,
				components
			});

			await i.editReply({ content: 'התיאור שונה בהצלחה ✅', flags: MessageFlags.Ephemeral });
		} catch (err) {
			console.error('Error editing server description:', err);
		}
	}

	parse(interaction) {
		return interaction.customId === 'setserverdescription' ? this.some() : this.none();
	}
}

module.exports = { ButtonHandler };
