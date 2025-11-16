// setServerCategory.js - Components v2 Version
const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const Discord = require('discord.js');
const { ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, SeparatorSpacingSize } = Discord;
const categoryNames = {
	shop: 'חנות',
	whitelist: 'וויטליסט',
	allowlist: 'אלווליסט',
	public: 'פאבליק',
	fun: 'שרת לכיף',
	hosting: 'אחסונים'
};
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
		const select = new Discord.StringSelectMenuBuilder()
			.setCustomId('changecategory')
			.setPlaceholder('בחר קטגוריה')
			.setMaxValues(1)
			.addOptions(
				new Discord.StringSelectMenuOptionBuilder().setLabel('Whitelist').setDescription('שרת וויטליסט').setValue('whitelist'),
				new Discord.StringSelectMenuOptionBuilder().setLabel('Allowlist').setDescription('שרת אלווליסט').setValue('allowlist'),
				new Discord.StringSelectMenuOptionBuilder().setLabel('Public').setDescription('שרת פאבליק').setValue('public'),
				new Discord.StringSelectMenuOptionBuilder().setLabel('Fun').setDescription('שרת לכיף (DM, קהילות וכולי)').setValue('fun'),
				new Discord.StringSelectMenuOptionBuilder().setLabel('Shop').setDescription('שרת של חנות').setValue('shop'),
				new Discord.StringSelectMenuOptionBuilder().setLabel('Hosting').setDescription('שרת של חברת אחסון').setValue('hosting')
			);

		const row = new Discord.ActionRowBuilder().addComponents(select);

		const response = await interaction.deferReply({
			flags: Discord.MessageFlags.Ephemeral,
			fetchReply: true
		});

		await interaction.editReply({
			content: 'בחר קטגוריה חדשה:',
			components: [row]
		});

		const collector = response.createMessageComponentCollector({
			componentType: Discord.ComponentType.StringSelect,
			time: 30_000,
			filter: (i) => i.user.id === interaction.user.id && i.customId === 'changecategory'
		});

		collector.on('collect', async (i) => {
			const selectedCategory = i.values[0];

			const currentTopic = interaction.channel.topic || '';
			const messageIdMatch = currentTopic.match(/^(\d+)/);
			const messageId = messageIdMatch ? messageIdMatch[1] : null;

			const serverChannelIdMatch = currentTopic.match(/\[([^\]]+)\]$/);
			const serverChannelId = serverChannelIdMatch ? serverChannelIdMatch[1] : '';

			if (messageId) {
				const newTopic = serverChannelId ? `${messageId} (${selectedCategory})[${serverChannelId}]` : `${messageId} (${selectedCategory})`;
				await i.channel.setTopic(newTopic);
			} else {
				const newTopic = serverChannelId ? `0 (${selectedCategory})[${serverChannelId}]` : `0 (${selectedCategory})`;
				await i.channel.setTopic(newTopic);
			}

			await i.update({
				content: `הקטגוריה שונתה ל: **${categoryNames[selectedCategory]}**`,
				components: []
			});

			collector.stop();
		});

		collector.on('end', async (collected, reason) => {
			if (reason === 'time' && collected.size === 0) {
				try {
					await interaction.editReply({
						content: 'פג תוקף הבחירה של קטגוריה. נסה שני.',
						components: []
					});
				} catch (error) {
					console.error('Failed to edit expired select menu reply:', error);
				}
			}
		});
	}

	/**
	 * Helper method to find image URL in components
	 * @param {Array} components - Message components
	 * @returns {string|null} - Image URL or null
	 */
	findImageUrl(components) {
		for (const component of components) {
			if (component.type === 17) {
				// Container
				for (const section of component.components || []) {
					if (section.type === 9 && section.accessory && section.accessory.type === 11) {
						// Section with thumbnail
						return section.accessory.media?.url;
					}
				}
			}
		}
		return null;
	}

	/**
	 * Helper method to extract title and description from components
	 * @param {Array} components - Message components
	 * @returns {Object} - Title and description
	 */
	extractTitleAndDescription(components) {
		let title = null;
		let description = null;

		for (const component of components) {
			if (component.type === Discord.ComponentType.Container) {
				// Container
				for (const section of component.components || []) {
					if (section.type === 9) {
						// Section
						for (const textComponent of section.components || []) {
							if (textComponent.type === Discord.ComponentType.TextDisplay) {
								// TextDisplay
								if (textComponent.content.startsWith('# ')) {
									title = textComponent.content;
								} else if (!textComponent.content.startsWith('#') && !textComponent.content.startsWith('-#')) {
									description = textComponent.content;
								}
							}
						}
					}
				}
			}
		}

		return { title, description };
	}

	/**
	 * Helper method to extract social buttons
	 * @param {Array} components - Message components
	 * @returns {Array} - Array of button builders
	 */
	extractSocialButtons(components) {
		const socialButtons = [];
		const socialTypes = ['youtube', 'tiktok', 'website'];

		for (const component of components) {
			if (component.type === Discord.ComponentType.ActionRow) {
				// Action row
				let isSocialRow = false;
				const rowButtons = [];

				for (const btn of component.components || []) {
					if (btn.type === Discord.ComponentType.Button && btn.style === Discord.ButtonStyle.Link) {
						// Link button
						const label = btn.label?.toLowerCase() || '';
						// Check if this is a social button
						if (socialTypes.some((type) => label.includes(type))) {
							isSocialRow = true;
							rowButtons.push(
								new Discord.ButtonBuilder()
									.setLabel(btn.label)
									.setStyle(Discord.ButtonStyle.Link)
									.setURL(btn.url)
									.setEmoji(btn.emoji || null)
							);
						}
					}
				}

				if (isSocialRow) {
					return rowButtons;
				}
			}
		}

		return [];
	}

	/**
	 * Helper method to extract control rows
	 * @param {Array} components - Message components
	 * @returns {Array} - Array of control rows
	 */
	extractControlRows(components) {
		const controlRows = [];
		for (const component of components) {
			if (component.type === Discord.ComponentType.ActionRow) {
				const hasControlButtons = component.components.some((btn) =>
					[
						'setservername',
						'setserverdescription',
						'setservericon',
						'setserverlink',
						'setservercategory',
						'setserverip',
						'addsocial',
						'submitserver',
						'cancelserver',
						'byfivemisrael'
					].includes(btn.customId)
				);
				if (hasControlButtons) {
					controlRows.push(component);
				}
			}
		}
		return controlRows;
	}

	/**
	 * Helper method to find button by custom ID
	 * @param {Array} components - Message components
	 * @param {string} customId - Custom ID to find
	 * @returns {Object|null} - Button data or null
	 */
	findButtonByCustomId(components, customId) {
		for (const component of components) {
			if (component.type === Discord.ComponentType.ActionRow || component.type === Discord.ComponentType.Container) {
				const comps = component.components || [];
				for (const comp of comps) {
					if (comp.type === Discord.ComponentType.Button && comp.customId === customId) {
						return comp;
					} else if (
						comp.type === Discord.ComponentType.Section &&
						comp.accessory &&
						comp.accessory.type === Discord.ComponentType.Button &&
						comp.accessory.customId === customId
					) {
						return comp.accessory;
					}
				}
			}
		}
		return null;
	}

	/**
	 * Helper method to find link button by label
	 * @param {Array} components - Message components
	 * @param {string} label - Label to find
	 * @returns {Object|null} - Button data or null
	 */
	findLinkButtonByLabel(components, label) {
		for (const component of components) {
			if (component.type === Discord.ComponentType.ActionRow) {
				for (const btn of component.components || []) {
					if (btn.type === Discord.ComponentType.Button && btn.style === Discord.ButtonStyle.Link && btn.label === label) {
						return btn;
					}
				}
			}
		}
		return null;
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'setservercategory') return this.none();
		return this.some();
	}
}

module.exports = {
	ButtonHandler
};
