const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const {
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	FileBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	ThumbnailBuilder
} = require('discord.js');
const config = require('../../config');
const Discord = require('discord.js');
class TicketMenuHandler extends InteractionHandler {
	constructor(ctx, options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.SelectMenu
		});
	}

	parse(interaction) {
		if (interaction.customId !== 'choosecategory') return this.none();

		return this.some();
	}
	/**
	 *
	 * @param {Discord.StringSelectMenuInteraction} interaction
	 */
	async run(interaction) {
		const option = interaction.values[0];

		// Check if this is from an edit form (ephemeral response) or new server creation
		const isEditForm = interaction.ephemeral;
		let title = isEditForm ? `${interaction.user.username}-עריכת-שרת` : `${interaction.user.username}-בניית-שרת`;

		const channel = await interaction.guild.channels.create({
			name: title,
			permissionOverwrites: [
				{
					id: interaction.guild.roles.everyone.id,
					deny: ['ViewChannel']
				},
				{
					id: interaction.user.id,
					allow: ['ViewChannel'],
					deny: ['SendMessages']
				}
			],
			parent: config.tickets.addServers
		});

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
		// const website = new Discord.ButtonBuilder().setEmoji("<:www:1373383301695541368>").setLabel('Our Website').setStyle(Discord.ButtonStyle.Link).setURL(`https://discord.gg/6xwuYRPzd4`)
		// const youtube = new Discord.ButtonBuilder().setEmoji("<:youtube:1373382831819980821>").setLabel('Our Youtube').setStyle(Discord.ButtonStyle.Link).setURL(`https://discord.gg/6xwuYRPzd4`)
		// const tiktok = new Discord.ButtonBuilder().setEmoji("<:tiktok:1373385826070695986>").setLabel('Our TikTok').setStyle(Discord.ButtonStyle.Link).setURL(`https://discord.gg/6xwuYRPzd4`)

		// const SocialRow = new Discord.ActionRowBuilder().addComponents([website, youtube, tiktok]);
		const join = new Discord.ButtonBuilder()
			.setEmoji(config.emojis.loading)
			.setDisabled(true)
			.setLabel('Join Here')
			.setStyle(Discord.ButtonStyle.Link)
			.setURL(`https://discord.gg/6xwuYRPzd4`);

		const votes = new Discord.ButtonBuilder()
			.setCustomId('votes_display')
			.setLabel('0')
			.setDisabled(true)
			.setStyle(Discord.ButtonStyle.Secondary);
		// For new servers, they won't be verified initially, but we'll set up the structure
		// The verified emoji will be added later when the server is actually verified
		const container = new ContainerBuilder()
			.setAccentColor(Discord.Colors.Blurple)
			.addSectionComponents(
				new SectionBuilder()
					.addTextDisplayComponents(new TextDisplayBuilder().setContent('# שם של השרת שלך'))
					.setThumbnailAccessory(new ThumbnailBuilder().setURL(`https://${config.r2.customDomain}/static/defaultserverimage.png`))
					.addTextDisplayComponents(new TextDisplayBuilder().setContent(['תיאור לשרת שלך'].join('\n')))
			)
			.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
			.addSectionComponents(
				new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('## Votes')).setButtonAccessory(votes)
			)
			.addSeparatorComponents((builder) => builder.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
			// .addActionRowComponents(SocialRow)
			// .addSeparatorComponents((builder) =>
			//     builder.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
			// )
			.addActionRowComponents(new Discord.ActionRowBuilder().setComponents([join, VoteButton, ServerOwnerOptions]));

		const category = config.categories.find((c) => c.type == option);
		let msg;
		const row = new Discord.ActionRowBuilder();
		const row2 = new Discord.ActionRowBuilder();
		row.setComponents([
			new Discord.ButtonBuilder().setCustomId('setservername').setLabel('שנה שם').setStyle(Discord.ButtonStyle.Primary),
			new Discord.ButtonBuilder().setCustomId('setserverdescription').setLabel('שנה תיאור').setStyle(Discord.ButtonStyle.Primary),
			new Discord.ButtonBuilder().setCustomId('setservericon').setLabel('שנה לוגו').setStyle(Discord.ButtonStyle.Primary),
			new Discord.ButtonBuilder().setCustomId('setserverlink').setLabel('שנה קישור').setStyle(Discord.ButtonStyle.Primary),
			new Discord.ButtonBuilder().setCustomId('setservercategory').setLabel('שנה קטגוריה').setStyle(Discord.ButtonStyle.Primary)
		]);
		if (category.rp)
			row2.addComponents([
				new Discord.ButtonBuilder()
					.setCustomId('setserverip')
					.setLabel('[!בקרוב] חבר שרת פייבאם')
					.setStyle(Discord.ButtonStyle.Primary)
					.setDisabled(true)
			]);
		row2.addComponents([
			new Discord.ButtonBuilder().setCustomId('addsocial').setLabel('הוסף מדיה חברתית').setStyle(Discord.ButtonStyle.Primary),
			new Discord.ButtonBuilder().setCustomId('submitserver').setLabel('סיים').setStyle(Discord.ButtonStyle.Success),
			new Discord.ButtonBuilder().setCustomId('cancelserver').setLabel('בטל').setStyle(Discord.ButtonStyle.Danger),
			new Discord.ButtonBuilder()
				.setCustomId('byfivemisrael')
				.setLabel(`©️ ${config.serverName}, מרכז הפייבאם הישראלי`)
				.setStyle(Discord.ButtonStyle.Secondary)
				.setDisabled(true)
		]);
		await channel.send({
			content: `${interaction.user}`
		});
		msg = await channel.send({
			components: [container, row, row2],
			flags: [MessageFlags.IsComponentsV2]
		});

		channel.setTopic(msg.id + ` (${option})`);

		if (isEditForm) {
			// For edit form, send ephemeral response
			await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });
			await interaction.editReply({
				content: `מצוין! בואו נעבור ל ${channel.url} לעריכת השרת שלך (תוכל לשנות קטגוריה בכל עת)`,
				components: []
			});
		} else {
			// For new server creation, send regular update
			await interaction.deferUpdate();
			await interaction.editReply({
				components: [],
				content: `מצוין! בואו נעבור ל ${channel.url} (תוכל לשנות קטגוריה בכל עת)`
			});
		}
	}
}
module.exports = {
	TicketMenuHandler
};
