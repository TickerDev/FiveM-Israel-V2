const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const Discord = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB({ table: 'tickets' });
const config = require('../../../../config');

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
	 * Extract category from channel topic
	 */
	extractCategoryFromTopic(channelTopic) {
		if (!channelTopic) return null;
		const match = channelTopic.match(/\(([^)]+)\)/);
		return match ? match[1] : null;
	}

	/**
	 * Extract data from Components V2 message
	 */
	extractDataFromComponents(components) {
		let title = null;
		let description = null;
		let imageUrl = null;
		let link = null;

		for (const component of components) {
			if (component.type === Discord.ComponentType.Container) {
				// Extract title, description, and image
				for (const section of component.components || []) {
					if (section.type === Discord.ComponentType.Section) {
						// Get thumbnail/image
						if (section.accessory?.type === Discord.ComponentType.Thumbnail) {
							imageUrl = section.accessory.media?.url;
						}

						// Get title and description from text displays
						for (const textComponent of section.components || []) {
							if (textComponent.type === Discord.ComponentType.TextDisplay) {
								if (textComponent.content.startsWith('# ')) {
									title = textComponent.content.replace('# ', '');
								} else if (!description) {
									description = textComponent.content;
								}
							}
						}
					}

					// Check for action rows inside the container
					if (section.type === Discord.ComponentType.ActionRow) {
						for (const btn of section.components || []) {
							if (btn.type === Discord.ComponentType.Button && btn.style === Discord.ButtonStyle.Link && btn.label === 'Join Here') {
								link = btn.url;
							}
						}
					}
				}
			}
		}

		return { title, description, imageUrl, link };
	}

	/**
	 * @param {*} data
	 */
	performCheck(data) {
		if (!data.title || data.title === 'שם של השרת שלך') return false;
		else if (!data.description || data.description == 'תיאור לשרת שלך') return false;
		else if (!data.imageUrl || data.imageUrl === `https://${config.r2.customDomain}/static/defaultserverimage.png`) return false;
		else if (!data.link || data.link.length == 0 || data.link == null) return false;
		else if (!data.category || data.category == null) return false;
		else return true;
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	async run(interaction) {
		await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });

		const data = this.extractDataFromComponents(interaction.message.components);
		data.category = this.extractCategoryFromTopic(interaction.channel.topic);
		data.owner = interaction.user.id;

		await interaction.editReply({
			content: '<a:loading1:1222362979157414039> **תן לי רגע לחשב הכל**',
			components: [],
			embeds: []
		});

		if (!this.performCheck(data)) {
			return await interaction.editReply({
				content: '**🚫 לא ביצעת שינויים/שינויים לא גמורים 🚫**',
				components: [],
				embeds: []
			});
		}

		// Clone existing components
		const components = JSON.parse(JSON.stringify(interaction.message.components));

		// Filter out ALL action rows (control buttons and Hebrew button rows)
		const filteredComponents = components.filter((component) => {
			// Keep only Container components, remove all ActionRow components
			return component.type !== Discord.ComponentType.ActionRow;
		});

		// Create new staff review buttons (without the extra Join button)
		let button1 = new Discord.ButtonBuilder().setCustomId(`staff_option`).setStyle(Discord.ButtonStyle.Primary).setLabel('Staff Options');

		let button2 = new Discord.ButtonBuilder().setCustomId(`accept`).setStyle(Discord.ButtonStyle.Success).setLabel('Accept');

		let button3 = new Discord.ButtonBuilder().setCustomId(`decline`).setStyle(Discord.ButtonStyle.Danger).setLabel('Decline');

		let button4 = new Discord.ButtonBuilder().setCustomId(`editform`).setStyle(Discord.ButtonStyle.Primary).setLabel('Edit Form');

		const staffRow = new Discord.ActionRowBuilder().addComponents([button1, button2, button3, button4]);

		// Add the new staff buttons row
		filteredComponents.push(staffRow);

		await interaction.message.edit({
			components: filteredComponents
		});

		// Give staff permission to see the channel when submitted
		await interaction.channel.permissionOverwrites.create(config.staffRole, {
			ViewChannel: true
		});
		await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
			SendMessages: true
		});
		interaction.channel.send({
			content: `<@${interaction.user.id}> <@&${config.staffRole}>`
		});
		await interaction.message.pin();

		await interaction.editReply({
			content: '✅ השרת נשלח לבדיקת צוות!'
		});
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'submitserver') return this.none();
		return this.some();
	}
}

module.exports = {
	ButtonHandler
};
