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
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
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
const { prisma } = require('../../../prisma');
class TicketAddButtonHandler extends InteractionHandler {
	constructor(ctx, options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	parse(interaction) {
		if (interaction.customId !== 'editform') return this.none();

		return this.some();
	}
	/**
	 *
	 * @param {CommandInteraction} interaction
	 * @returns
	 */
	async run(interaction) {
		if (interaction.channel.parentId == config.tickets.blacklist) {
			// For blacklist, show a modal as before since it's different from server creation
			const Modal = new Discord.ModalBuilder().setCustomId('blacklistedit').setTitle('Edit Form (לשנות רק מה שצריך!)');
			const serverName = new Discord.TextInputBuilder()
				.setPlaceholder(':לדוגמה tickerboi')
				.setLabel('שם בדיסקורד של האדם עליו אתה מגיש:')
				.setCustomId('namequestion')
				.setStyle(TextInputStyle.Short)
				.setRequired(false);
			const serverDescription = new Discord.TextInputBuilder()
				.setPlaceholder('לדוגמה: 756424816516530247')
				.setLabel('איידי של מקבל הבלאקליסט:')
				.setCustomId('idquestion')
				.setStyle(TextInputStyle.Short)
				.setRequired(false);
			const reason = new Discord.TextInputBuilder()
				.setPlaceholder("לדוגמה: עשה צ'יטים")
				.setLabel('סיבה לקבלת הבלאקליסט:')
				.setCustomId('reasonquestion')
				.setStyle(TextInputStyle.Paragraph)
				.setRequired(false);
			const evidence = new Discord.TextInputBuilder()
				.setPlaceholder('לדוגמה: https://cdn.discordapp.com/attachments/1064236969795793017/1065030032315133962/2Q.png')
				.setLabel('הוכחה (חובה!):')
				.setCustomId('evidence')
				.setStyle(TextInputStyle.Short)
				.setRequired(false);
			const evidence2 = new Discord.TextInputBuilder()
				.setPlaceholder('לדוגמה: https://cdn.discordapp.com/attachments/1064236969795793017/1065030032315133962/2Q.png')
				.setLabel('הוכחה (אינו חובה):')
				.setCustomId('evidence2')
				.setStyle(TextInputStyle.Short)
				.setRequired(false);
			const serverNameRow = new Discord.ActionRowBuilder().addComponents(serverName);
			const serverDescriptionRow = new Discord.ActionRowBuilder().addComponents(serverDescription);
			const reasonRow = new Discord.ActionRowBuilder().addComponents(reason);
			const evidenceRow = new Discord.ActionRowBuilder().addComponents(evidence);
			const evidenceRow2 = new Discord.ActionRowBuilder().addComponents(evidence2);

			Modal.addComponents([serverNameRow, serverDescriptionRow, reasonRow, evidenceRow, evidenceRow2]);
			await interaction.showModal(Modal);
		}
		if (interaction.channel.parentId == config.tickets.addServers) {
			// Get the original server channel ID from the current ticket channel
			// The ticket channel should have the original server channel ID in its topic or we need to find it
			// For now, let's try to get it from the channel topic or find it by user
			let originalServerChannelId = null;

			// Try to extract from channel topic first
			if (interaction.channel.topic && interaction.channel.topic.includes('server:')) {
				const match = interaction.channel.topic.match(/server:(\d+)/);
				if (match) {
					originalServerChannelId = match[1];
				}
			}

			// If not found in topic, try to find by user ID
			if (!originalServerChannelId) {
				const userServers = await prisma.servers.findMany({
					where: { ownerID: interaction.user.id, guildID: interaction.guild.id }
				});
				if (userServers.length > 0) {
					originalServerChannelId = userServers[0].channelID;
				}
			}

			if (!originalServerChannelId) {
				await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });
				return interaction.editReply({
					content: 'לא ניתן למצוא את השרת המקורי.'
				});
			}

			// Get the server data from the original server channel
			const server = await prisma.servers.findUnique({
				where: { channelID: originalServerChannelId }
			});

			if (!server) {
				await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });
				return interaction.editReply({
					content: 'לא ניתן למצוא את השרת במסד הנתונים.'
				});
			}

			// Use the current ticket channel instead of creating a new one
			const channel = interaction.channel;

			// Delete all messages in the channel
			const messages = await channel.messages.fetch();
			await channel.bulkDelete(messages);

			// Update channel permissions - only the member can see it
			await channel.permissionOverwrites.set([
				{
					id: interaction.guild.roles.everyone.id,
					deny: 'ViewChannel'
				},
				{
					id: interaction.user.id,
					allow: 'ViewChannel'
				}
			]);

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
			const container = new ContainerBuilder()
				.setAccentColor(Discord.Colors.Blurple)
				.addSectionComponents(
					new SectionBuilder()
						.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${server.name}`))
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
			// First send the user mention
			await channel.send({
				content: `${interaction.user}`
			});

			// Then send the Components V2 message without content
			const msg = await channel.send({
				components: [container, row, row2],
				flags: [MessageFlags.IsComponentsV2]
			});

			// Set channel topic with message ID, current category, and original server channel ID
			channel.setTopic(`${msg.id} (${server.category})[${originalServerChannelId}]`);

			// Reply to user
			await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });
			await interaction.editReply({
				content: `מצוין! עכשיו תוכל לערוך את השרת שלך כאן`
			});
		}
	}
}
module.exports = {
	TicketAddButtonHandler
};
