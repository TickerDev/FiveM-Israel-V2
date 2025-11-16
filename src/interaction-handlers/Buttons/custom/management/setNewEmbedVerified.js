const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const {
	Client,
	GatewayIntentBits,
	UserSelectMenuBuilder,
	Collection,
	ApplicationCommandOptionType,
	ActivityType,
	EmbedBuilder,
	MessageFlags,
	PermissionsBitField,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	ChannelType,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	CommandInteraction,
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
	SeparatorSpacingSize,
	ComponentType
} = require('discord.js');
const Discord = require('discord.js');
const config = require('../../../../config');
class TicketAddButtonHandler extends InteractionHandler {
	constructor(ctx, options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	parse(interaction) {
		if (interaction.customId !== 'setverified') return this.none();

		return this.some();
	}
	/**
	 *
	 * @param {CommandInteraction} interaction
	 * @returns
	 */
	async run(interaction) {
		const server = await this.container.client.db.getServer(interaction.channelId);
		if (!server) return interaction.reply({ flags: MessageFlags.Ephemeral, content: 'No server was found' });

		// Toggle verification status in the main database
		const updatedServer = await this.container.client.db.toggleServerVerified(interaction.channelId);
		if (!updatedServer) {
			return interaction.reply({ flags: MessageFlags.Ephemeral, content: 'Failed to update verification status' });
		}

		// Get the current message to extract existing data
		const msg = await interaction.channel.messages.fetch(`${server.messageId}`);
		const originalComponents = msg.components;

		// Extract existing data from Components V2
		let title = null;
		let description = null;
		let imageUrl = null;
		let socialButtons = [];
		let categoryInfo = null;

		// Extract data from existing Components V2
		for (const component of originalComponents) {
			if (component.type === ComponentType.Container) {
				for (const section of component.components || []) {
					if (section.type === ComponentType.Section) {
						// Get title and description from text displays
						for (const textComponent of section.components || []) {
							if (textComponent.type === ComponentType.TextDisplay) {
								const content = textComponent.content;
								if (content.startsWith('# ')) {
									// Remove any existing verified emoji from the title and clean up extra spaces
									title = content.replace(config.emojis.verified, '').replace(/\s+/g, ' ').trim();
								} else if (!title) {
									description = content;
								}
							}
						}
						// Get thumbnail URL
						if (section.thumbnail) {
							imageUrl = section.thumbnail.url;
						}
					}
				}
			} else if (component.type === ComponentType.ActionRow) {
				// Extract social buttons
				for (const button of component.components || []) {
					if (button.type === ComponentType.Button && button.style === ButtonStyle.Link) {
						socialButtons.push(button);
					}
				}
			}
		}

		// Create Components V2 container with updated verification status
		const titlePrefix = updatedServer.verified ? config.emojis.verified : '';
		const displayTitle = title ? `# ${titlePrefix} ${title.replace('# ', '')}` : '# שם השרת שלך';

		const votesButton = new ButtonBuilder()
			.setCustomId('votes_display')
			.setLabel(server.votes?.toString() || '0')
			.setDisabled(true)
			.setStyle(ButtonStyle.Secondary);

		const container = new ContainerBuilder()
			.setAccentColor(Discord.Colors.Blurple)
			.addSectionComponents(
				new SectionBuilder()
					.addTextDisplayComponents(new TextDisplayBuilder().setContent(displayTitle))
					.setThumbnailAccessory(
						new ThumbnailBuilder().setURL(imageUrl || server.image || `https://${config.r2.customDomain}/static/defaultserverimage.png`)
					)
					.addTextDisplayComponents(new TextDisplayBuilder().setContent(description || server.description || 'תיאור לשרת שלך'))
			)
			.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
			.addSectionComponents(
				new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('## Votes')).setButtonAccessory(votesButton)
			)
			.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(SeparatorSpacingSize.Large));

		// Add social buttons if they exist
		if (socialButtons.length > 0) {
			container.addActionRowComponents(new ActionRowBuilder().addComponents(socialButtons));
			container.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
		}

		// Add main buttons
		const joinButton = new ButtonBuilder().setEmoji(config.emojis.discord).setLabel('Join Here').setStyle(ButtonStyle.Link).setURL(server.invite);

		const voteButton = new ButtonBuilder()
			.setLabel('Vote Server')
			.setCustomId('voteforserver')
			.setEmoji(config.emojis.checkmark)
			.setStyle(ButtonStyle.Primary);

		const optionsButton = new ButtonBuilder()
			.setLabel('Options')
			.setCustomId('owneroptions')
			.setEmoji(config.emojis.loading)
			.setStyle(ButtonStyle.Primary);

		container.addActionRowComponents(new ActionRowBuilder().addComponents([joinButton, voteButton, optionsButton]));

		// Add category info if exists
		if (categoryInfo) {
			container.addTextDisplayComponents(new TextDisplayBuilder().setContent(categoryInfo));
		}

		// Extract and preserve control rows (editing buttons, etc.)
		const controlRows = this.extractControlRows(originalComponents);

		// Update the message with Components V2
		await msg.edit({
			flags: Discord.MessageFlags.IsComponentsV2,
			components: [container, ...controlRows]
		});

		// Send appropriate response message
		const responseMessage = updatedServer.verified ? 'Server verified!' : 'Server verification removed!';
		interaction.reply({
			content: responseMessage,
			flags: MessageFlags.Ephemeral
		});

		// Send notification to owner only if server was verified (not when unverified)
		if (updatedServer.verified) {
			try {
				const owner = interaction.guild.members.cache.get(String(server.ownerID));
				if (!owner) return;

				owner
					.send({
						embeds: [
							new Discord.EmbedBuilder()
								.setAuthor({
									name: `הבוט של ${config.serverName}`,
									iconURL: interaction.guild.iconURL()
								})
								.setTitle(`הודעה חשובה על השרת שלך`)
								.setDescription(
									`שלום רב ${owner.user.displayName}, כאן הבוט של ${config.serverName}, הרשימה מספר אחת בארץ
                            **אנחנו שמחים להודיע לך שהשרת שלך אומת על ידי ${config.serverName}!**`
								)
								.addFields([
									{
										name: '?מה זה אומר',
										value: `אימות הינו דבר ששרתים גדולים מקבלים על מנת לאמת את עצמם. מתנה קטנה מאיתנו שהשרתים הגדולים ביותר מקבלים - ואתה אחד מהם!`,
										inline: true
									},
									{
										name: '?מה זה נותן',
										value: `מעבר לייצוגיות, מנהלי שרתים מאומתים מקבלים גישה לפיצ'רים בבטא מוקדמת!`,
										inline: true
									}
								])
								.setFooter({
									text: `תמיד בשבילך - ${config.serverName}`,
									iconURL: interaction.guild.iconURL()
								})
								.setColor(config.embed_color)
						],
						components: [
							new Discord.ActionRowBuilder().setComponents([
								new ButtonBuilder()
									.setStyle(Discord.ButtonStyle.Link)
									.setLabel('לשרת שלך')
									.setURL(`https://discord.com/channels/${interaction.guildId}/${interaction.channelId}`),
								new ButtonBuilder()
									.setStyle(Discord.ButtonStyle.Secondary)
									.setLabel(`🚀 נשלח מ${config.serverName}`)
									.setDisabled(true)
									.setCustomId('sentfromfivemisraelyesyes')
							])
						]
					})
					.catch((err) => []);
			} catch (error) {
				return;
			}
		}
	}

	// Helper function to extract control rows (editing buttons, etc.)
	extractControlRows(components) {
		const controlRows = [];
		for (const component of components) {
			if (component.type === ComponentType.ActionRow) {
				// Check if this row contains control buttons (not social buttons)
				const hasControlButtons = component.components.some(
					(button) =>
						button.type === ComponentType.Button &&
						(button.customId?.includes('setserver') ||
							button.customId?.includes('submit') ||
							button.customId?.includes('cancel') ||
							button.customId?.includes('addsocial') ||
							button.customId?.includes('byfivemisrael'))
				);
				if (hasControlButtons) {
					controlRows.push(component);
				}
			}
		}
		return controlRows;
	}
}
module.exports = {
	TicketAddButtonHandler
};
