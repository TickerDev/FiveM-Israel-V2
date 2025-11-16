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
	CommandInteraction
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
		if (interaction.customId !== 'owneroptions') return this.none();

		return this.some();
	}
	/**
	 *
	 * @param {CommandInteraction} interaction
	 * @returns
	 */
	async run(interaction) {
		const server = await client.db.getServer(interaction.channelId);
		if (!server) {
			return interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: 'לא מצאתי את השרת במערכת.'
			});
		}
		if (
			server.ownerID !== interaction.user.id &&
			!interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator) &&
			!interaction.member.roles.cache.has('1067889879100424192')
		) {
			return interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: 'אין לך גישה לזה!'
			});
		}
		if (
			interaction.member.roles.cache.has('1067889879100424192') &&
			!interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)
		) {
			let deleteButton = new Discord.ButtonBuilder()
				.setCustomId(`deleteserverroom`)
				.setStyle(Discord.ButtonStyle.Danger)
				.setLabel('בקשת מחיקה');
			let linkExpired = new Discord.ButtonBuilder().setCustomId(`linkexpired`).setStyle(Discord.ButtonStyle.Danger).setLabel('בקשת מחיקה');

			const row = new Discord.ActionRowBuilder().addComponents([deleteButton]);
			return interaction.reply({
				components: [row],
				flags: MessageFlags.Ephemeral,
				content: 'This is the menu to delete a server, if you delete do not forget to remove the roles from the owner..'
			});
		}
		if (interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
			let edit = new Discord.ButtonBuilder().setCustomId(`editrequestserver`).setStyle(Discord.ButtonStyle.Primary).setLabel('בקשת עריכה');
			let deleteButton = new Discord.ButtonBuilder()
				.setCustomId(`deleteserverroom`)
				.setStyle(Discord.ButtonStyle.Danger)
				.setLabel('בקשת מחיקה');
			let GiveOwnership = new Discord.ButtonBuilder()
				.setCustomId(`giveownership`)
				.setStyle(Discord.ButtonStyle.Primary)
				.setLabel('להעביר ניהול');
			let setVotesMenu = new Discord.ButtonBuilder()
				.setCustomId(`setvotessecretmenu`)
				.setStyle(Discord.ButtonStyle.Secondary)
				.setLabel('Set Votes [Managers Only]');
			let giveVerified = new Discord.ButtonBuilder()
				.setCustomId(`setverified`)
				.setStyle(Discord.ButtonStyle.Secondary)
				.setLabel('Toggle Verified [Managers Only]');
			let update = new Discord.ButtonBuilder()
				.setCustomId(`updatemessage`)
				.setStyle(Discord.ButtonStyle.Secondary)
				.setLabel('Update Message [Managers Only]');
			let pinMessage = new Discord.ButtonBuilder()
				.setCustomId(`pinnedmessagebutton`)
				.setStyle(Discord.ButtonStyle.Secondary)
				.setLabel('הצמד הודעה [בטא]');

			let webhookIntergration = new Discord.ButtonBuilder().setCustomId('webtest').setStyle(Discord.ButtonStyle.Primary).setLabel('סדר לוגים');
			let freezeServer = new Discord.ButtonBuilder().setCustomId('freeze').setStyle(Discord.ButtonStyle.Primary).setLabel('הקפא שרת');
			const row = new Discord.ActionRowBuilder().addComponents([edit, deleteButton, GiveOwnership, webhookIntergration]);
			const secretRow = new Discord.ActionRowBuilder().addComponents([pinMessage, setVotesMenu, giveVerified, update, freezeServer]);
			return interaction.reply({
				components: [row, secretRow],
				flags: MessageFlags.Ephemeral,
				content: 'This menu is injected with some **_✨personality✨_** for the Managers.'
			});
		}
		if (await db.get(interaction.channelId)) {
			let edit = new Discord.ButtonBuilder().setCustomId(`editrequestserver`).setStyle(Discord.ButtonStyle.Primary).setLabel('בקשת עריכה');
			let deleteButton = new Discord.ButtonBuilder()
				.setCustomId(`deleteserverroom`)
				.setStyle(Discord.ButtonStyle.Danger)
				.setLabel('בקשת מחיקה');
			let GiveOwnership = new Discord.ButtonBuilder()
				.setCustomId(`giveownership`)
				.setStyle(Discord.ButtonStyle.Primary)
				.setLabel('להעביר ניהול');
			let pinMessage = new Discord.ButtonBuilder()
				.setCustomId(`pinnedmessagebutton`)
				.setStyle(Discord.ButtonStyle.Secondary)
				.setLabel('הצמד הודעה [בטא]');
			let webhookIntergration = new Discord.ButtonBuilder().setCustomId('webtest').setStyle(Discord.ButtonStyle.Primary).setLabel('סדר לוגים');
			const row = new Discord.ActionRowBuilder().addComponents([edit, deleteButton, GiveOwnership, webhookIntergration]);
			const secretRow = new Discord.ActionRowBuilder().addComponents([pinMessage]);
			return interaction.reply({
				components: [row, secretRow],
				flags: MessageFlags.Ephemeral
			});
		}
		//pinnedmessagebutton
		let edit = new Discord.ButtonBuilder().setCustomId(`editrequestserver`).setStyle(Discord.ButtonStyle.Primary).setLabel('בקשת עריכה');
		let deleteButton = new Discord.ButtonBuilder().setCustomId(`deleteserverroom`).setStyle(Discord.ButtonStyle.Danger).setLabel('בקשת מחיקה');
		let GiveOwnership = new Discord.ButtonBuilder().setCustomId(`giveownership`).setStyle(Discord.ButtonStyle.Primary).setLabel('להעביר ניהול');
		let webhookIntergration = new Discord.ButtonBuilder().setCustomId('webtest').setStyle(Discord.ButtonStyle.Primary).setLabel('סדר לוגים');
		const row = new Discord.ActionRowBuilder().addComponents([edit, deleteButton, GiveOwnership, webhookIntergration]);
		interaction.reply({
			components: [row],
			flags: MessageFlags.Ephemeral
		});
	}
}
module.exports = {
	TicketAddButtonHandler
};
