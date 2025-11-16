const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const config = require('../../../config');
const {
	Client,
	GatewayIntentBits,
	UserSelectMenuBuilder,
	Collection,
	ApplicationCommandOptionType,
	ActivityType,
	EmbedBuilder,
	PermissionsBitField,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
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
	MessageFlags
} = require('discord.js');
const Discord = require('discord.js');
const { client } = require('../../../index');
class TicketAddButtonHandler extends InteractionHandler {
	constructor(ctx, options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	parse(interaction) {
		if (interaction.customId !== 'editrequestserver') return this.none();

		return this.some();
	}
	/**
	 *
	 * @param {CommandInteraction} interaction
	 * @returns
	 */
	async run(interaction) {
		const server = await client.db.getServer(interaction.channelId);

		if (server.owner_id !== interaction.user.id && !interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
			await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });
			return interaction.editReply({
				content: 'אין לך גישה לזה!'
			});
		}

		// Create edit channel
		const channel = await interaction.guild.channels.create({
			name: `${interaction.user.username}-עריכת-שרת`,
			permissionOverwrites: [
				{
					id: interaction.guild.roles.everyone.id,
					deny: 'ViewChannel'
				},
				{
					id: interaction.user.id,
					allow: 'ViewChannel'
				}
			],
			parent: config.tickets.addServers
		});

		// Create Components V2 message for editing
		const VoteButton = new Discord.ButtonBuilder()
			.setLabel('Vote Server')
			.setCustomId('voteforserver')
			.setEmoji(config.emojis.checkmark)
			.setStyle(Discord.ButtonStyle.Secondary)
			.setDisabled(true);

		const ServerOwnerOptions = new Discord.ButtonBuilder()
			.setLabel('Options')
			.setCustomId('owneroptions')
			.setEmoji(config.emojis.loading)
			.setStyle(Discord.ButtonStyle.Secondary)
			.setDisabled(true);

		const join = new Discord.ButtonBuilder()
			.setEmoji(config.emojis.loading)
			.setDisabled(true)
			.setLabel('Join Here')
			.setStyle(Discord.ButtonStyle.Link)
			.setURL(`https://discord.gg/6xwuYRPzd4`);

		const votes = new Discord.ButtonBuilder()
			.setCustomId('votes_display')
			.setLabel(server.votes?.toString() || '0')
			.setDisabled(true)
			.setStyle(Discord.ButtonStyle.Secondary);

		// Create container with current server data
		// For editing, show clean title without verified emoji
		const displayTitle = `# ${server.name}`;

		const container = new ContainerBuilder()
			.setAccentColor(Discord.Colors.Blurple)
			.addSectionComponents(
				new SectionBuilder()
					.addTextDisplayComponents(new TextDisplayBuilder().setContent(displayTitle))
					.setThumbnailAccessory(
						new ThumbnailBuilder().setURL(server.image || `https://${config.r2.customDomain}/static/defaultserverimage.png`)
					)
					.addTextDisplayComponents(new TextDisplayBuilder().setContent(server.description || 'תיאור לשרת שלך'))
			)
			.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
			.addSectionComponents(
				new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('## Votes')).setButtonAccessory(votes)
			)
			.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
			.addActionRowComponents(new Discord.ActionRowBuilder().setComponents([join, VoteButton, ServerOwnerOptions]));

		// Create editing buttons
		const row = new Discord.ActionRowBuilder();
		const row2 = new Discord.ActionRowBuilder();

		row.setComponents([
			new Discord.ButtonBuilder().setCustomId('setservername').setLabel('שנה שם').setStyle(Discord.ButtonStyle.Primary),
			new Discord.ButtonBuilder().setCustomId('setserverdescription').setLabel('שנה תיאור').setStyle(Discord.ButtonStyle.Primary),
			new Discord.ButtonBuilder().setCustomId('setservericon').setLabel('שנה לוגו').setStyle(Discord.ButtonStyle.Primary),
			new Discord.ButtonBuilder().setCustomId('setserverlink').setLabel('שנה קישור').setStyle(Discord.ButtonStyle.Primary),
			new Discord.ButtonBuilder().setCustomId('setservercategory').setLabel('שנה קטגוריה').setStyle(Discord.ButtonStyle.Primary)
		]);

		row2.setComponents([
			new Discord.ButtonBuilder().setCustomId('addsocial').setLabel('הוסף מדיה חברתית').setStyle(Discord.ButtonStyle.Primary),
			new Discord.ButtonBuilder().setCustomId('submitserver').setLabel('סיים').setStyle(Discord.ButtonStyle.Success),
			new Discord.ButtonBuilder().setCustomId('cancelserver').setLabel('בטל').setStyle(Discord.ButtonStyle.Danger),
			new Discord.ButtonBuilder()
				.setCustomId('byfivemisrael')
				.setLabel(`©️ ${config.serverName}, מרכז הפייבאם הישראלי`)
				.setStyle(Discord.ButtonStyle.Secondary)
				.setDisabled(true)
		]);

		// Send the editing interface
		await channel.send({
			content: `${interaction.user}`
		});

		const msg = await channel.send({
			components: [container, row, row2],
			flags: [MessageFlags.IsComponentsV2]
		});

		// Set channel topic with message ID and current category
		channel.setTopic(`${msg.id} (${server.category})[${interaction.channel.id}]`);

		// Reply to user
		await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });
		await interaction.editReply({
			content: `מצוין! בואו נעבור ל ${channel.url} לעריכת השרת שלך`
		});
	}
}
module.exports = {
	TicketAddButtonHandler
};
