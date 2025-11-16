const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const config = require('../../../config');
const { QuickDB } = require('quick.db');
const db = new QuickDB({ table: 'tickets' });
const { MessageFlags } = require('discord.js');
const Discord = require('discord.js');
class ModalHandler extends InteractionHandler {
	/**
	 * @param {InteractionHandler.LoaderContext} context
	 * @param {InteractionHandler.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.ModalSubmit
		});
	}

	/**
	 * @param {import('discord.js').ModalSubmitInteraction} interaction
	 */
	async run(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const reason = interaction.fields.getTextInputValue('deletereason');
		const { guild } = interaction;

		const ticketManager = require('../../../custom/tickets');
		const ticket = new ticketManager({
			client: this.container.client,
			userId: interaction.user.id,
			staffId: config.staffRole,
			type: 'general',
			logs: config.logChannel,
			guildId: interaction.guild.id
		});

		const userOpenedTicket = await ticket.hasTicketOpen;
		if (userOpenedTicket) {
			return interaction.editReply({
				flags: MessageFlags.Ephemeral,
				content: `**היי יו אחי!**, מה זה אמור להיות? **יש לך טיקט פתוח!** חזור אליו פה ${userOpenedTicket} *(אם אתה לא רואה את הטיקט פנה לצוות)*`
			});
		}

		const server = await client.db.getServer(interaction.channel.id);
		if (!server) {
			return interaction.editReply({
				content: 'לא מצאתי את השרת במערכת.'
			});
		}

		let button1 = new Discord.ButtonBuilder().setCustomId(`staff_option`).setStyle(Discord.ButtonStyle.Primary).setLabel('Staff Options');
		let button2 = new Discord.ButtonBuilder().setCustomId(`accept`).setStyle(Discord.ButtonStyle.Success).setLabel('Accept');
		let button3 = new Discord.ButtonBuilder().setCustomId(`decline`).setStyle(Discord.ButtonStyle.Danger).setLabel('Decline');
		const row = new Discord.ActionRowBuilder().addComponents([button1, button2, button3]);

		const channel = await interaction.guild.channels.create({
			name: `${interaction.user.username}-מחיקה`,
			reason: 'Created a deletion ticket for ' + interaction.user.username,
			parent: config.tickets.addServers,
			permissionOverwrites: [
				{
					id: interaction.user.id,
					allow: ['ViewChannel']
				},
				{
					id: interaction.guild.roles.everyone,
					deny: ['ViewChannel']
				},
				{
					id: config.serverListAccess,
					allow: ['ViewChannel']
				}
			]
		});

		const SRole = interaction.guild.roles.cache.find((x) => x.id == config.staffRole);

		const embed = new Discord.EmbedBuilder()
			.setColor(config.embed_color)
			.setTitle(`${channel.name}`)
			.addFields(
				{
					name: 'שם השרת',
					value: server.name
				},
				{
					name: 'חדר',
					value: `<#${interaction.channel.id}>`
				},
				{
					name: 'סיבה',
					value: reason
				}
			);

		const message = await channel.send({
			components: [row],
			content: `<@${interaction.user.id}> ${SRole}`,
			embeds: [embed]
		});

		await channel.setTopic(`${message.id} (deletion)[${interaction.channel.id}]`);

		await interaction.editReply({
			content: `נוצר חדר מחיקה ${channel}`,
			flags: MessageFlags.Ephemeral
		});
	}

	/**
	 * @param {import('discord.js').ModalSubmitInteraction} interaction
	 */
	parse(interaction) {
		if (interaction.customId !== 'deleteservermodal') return this.none();

		return this.some();
	}
}

module.exports = {
	ModalHandler
};
