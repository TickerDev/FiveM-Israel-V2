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
	ChannelType,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	CommandInteraction,
	MessageFlags
} = require('discord.js');
const Discord = require('discord.js');
const { client } = require('../../../index');
const quick = require('quick.db');
const db = new quick.QuickDB({ table: 'verified' });

class TicketAddButtonHandler extends InteractionHandler {
	constructor(ctx, options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	parse(interaction) {
		if (interaction.customId !== 'staffoptions') return this.none();

		return this.some();
	}
	/**
	 *
	 * @param {CommandInteraction} interaction
	 * @returns
	 */
	async run(interaction) {
		const server = await client.db.getServer(interaction.channelId);

		if (
			interaction.member.roles.cache.has(config.serverListManager) ||
			interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)
		) {
			let freezeServer = new Discord.ButtonBuilder().setCustomId('freeze').setStyle(Discord.ButtonStyle.Primary).setLabel('הקפא שרת');
			const row = new Discord.ActionRowBuilder().addComponents([freezeServer]);
			return interaction.reply({
				components: [row],
				flags: MessageFlags.Ephemeral,
				content: 'אפשרויות צוות'
			});
		} else interaction.reply({ content: 'אין לך גישה לזה', flags: MessageFlags.Ephemeral });
	}
}
module.exports = {
	TicketAddButtonHandler
};
