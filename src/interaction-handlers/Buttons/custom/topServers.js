const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const { PaginatedMessage } = require('@sapphire/discord.js-utilities');
const Discord = require('discord.js');
const config = require('../../../config');

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

	getTopIcon(pos) {
		if (pos == 1) {
			return '🥇';
		} else if (pos == 2) {
			return '🥈';
		} else if (pos == 3) {
			return '🥉';
		} else {
			return `\`${pos}.\``;
		}
	}

	formatServers(servers, guildId) {
		if (!servers || servers.length === 0) {
			return 'לא נמצאו שרתים בטופ הרשימה';
		}
		return servers
			.map((server, index) => {
				const verifiedPrefix = server.verified ? config.emojis.verified : '';
				return `${this.getTopIcon(index + 1)}. **${verifiedPrefix}[${server.name}](https://discord.com/channels/${guildId}/${server.channelID}) - ${server.votes} הצבעות!**\n`;
			})
			.join('\n');
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	async run(interaction) {
		const guildId = interaction.guild.id;
		await interaction.deferReply({
			flags: Discord.MessageFlags.Ephemeral
		});
		// Fetch servers for whitelist and allowlist (combined as "וויטליסט ואלווליסט")
		const whitelistServers = await this.container.prisma.servers.findMany({
			where: { category: 'whitelist' },
			take: 5,
			orderBy: { votes: 'desc' }
		});

		const allowlistServers = await this.container.prisma.servers.findMany({
			where: { category: 'allowlist' },
			take: 5,
			orderBy: { votes: 'desc' }
		});

		// Combine whitelist and allowlist servers, sorted by votes
		const combinedWhitelistAllowlist = [...whitelistServers, ...allowlistServers].sort((a, b) => b.votes - a.votes).slice(0, 5);

		const publicServers = await this.container.prisma.servers.findMany({
			where: { category: 'public' },
			take: 5,
			orderBy: { votes: 'desc' }
		});

		const funServers = await this.container.prisma.servers.findMany({
			where: { category: 'fun' },
			take: 5,
			orderBy: { votes: 'desc' }
		});

		const shopServers = await this.container.prisma.servers.findMany({
			where: { category: 'shop' },
			take: 5,
			orderBy: { votes: 'desc' }
		});

		const hostingServers = await this.container.prisma.servers.findMany({
			where: { category: 'hosting' },
			take: 5,
			orderBy: { votes: 'desc' }
		});

		// Create paginated message
		const categoryLabels = {
			1: 'וויטליסט ואלווליסט',
			2: 'פאבליק',
			3: 'כיף',
			4: 'חנות',
			5: 'חברת אחסון'
		};

		const paginatedMessage = new PaginatedMessage({
			template: new Discord.EmbedBuilder().setColor(config.embed_color).setFooter({ text: ' ' })
		})
			.setSelectMenuOptions((pageIndex) => ({
				label: categoryLabels[pageIndex] || `Page ${pageIndex}`
			}))
			.setSelectMenuPlaceholder('בחר קטגוריה');

		// Add page for "וויטליסט ואלווליסט"
		paginatedMessage.addPageEmbed((embed) =>
			embed.setTitle('🏆 וויטליסט ואלווליסט 🏆').setDescription(this.formatServers(combinedWhitelistAllowlist, guildId))
		);

		// Add page for "פאבליק"
		paginatedMessage.addPageEmbed((embed) => embed.setTitle('🏆 פאבליק 🏆').setDescription(this.formatServers(publicServers, guildId)));

		// Add page for "כיף"
		paginatedMessage.addPageEmbed((embed) => embed.setTitle('🏆 כיף 🏆').setDescription(this.formatServers(funServers, guildId)));

		// Add page for "חנות"
		paginatedMessage.addPageEmbed((embed) => embed.setTitle('🏆 חנות 🏆').setDescription(this.formatServers(shopServers, guildId)));

		// Add page for "חברת אחסון"
		paginatedMessage.addPageEmbed((embed) => embed.setTitle('🏆 חברת אחסון 🏆').setDescription(this.formatServers(hostingServers, guildId)));

		// Run the paginated message
		await paginatedMessage.run(interaction, interaction.user);
	}

	/**
	 * @param {import('discord.js').ButtonInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'top_servers') return this.none();
		return this.some();
	}
}

module.exports = {
	ButtonHandler
};
