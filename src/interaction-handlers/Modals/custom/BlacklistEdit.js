const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');
const config = require('../../../config');
const { QuickDB } = require('quick.db');
const db = new QuickDB({ table: 'blacklists' });
const { MessageFlags } = require('discord.js');
const Discord = require('discord.js');
const { client } = require('../../../index');
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
		const messageId = interaction.customId.replace('blacklistedit_', '');
		const { guild, channel } = interaction;
		const blacklist = await db.get(interaction.user.id);
		const channel1 = interaction.channel;
		if (!channel1) return;

		const message = await channel1.messages.fetch(messageId);
		if (!message) return;
		let nameResponse = interaction.fields.getTextInputValue('namequestion') || ticket.name;
		let id = interaction.fields.getTextInputValue('idquestion') || ticket.blacklistId;
		let reason = interaction.fields.getTextInputValue('reasonquestion') || ticket.reason;
		const existingEmbed = new Discord.EmbedBuilder(message.embeds[0]);
		let evidence = interaction.fields.getTextInputValue('evidence') || existingEmbed.data.fields[3];
		const evidence2Input = interaction.fields.getTextInputValue('evidence2');

		const evidenceField =
			evidence2Input && typeof evidence2Input === 'string'
				? `[לחצו פה](${evidence}), [לחצו פה](${evidence2Input})`
				: ticket.evidence2 && typeof ticket.evidence2 === 'string'
					? `[לחצו פה](${evidence}), [לחצו פה](${ticket.evidence2})`
					: `[לחצו פה](${evidence})`;
		const embed = new Discord.EmbedBuilder()
			.setColor(config.embed_color)
			.setTitle(channel.name)
			.addFields(
				{ name: 'שם מקבל הבלאקליסט', value: String(nameResponse) },
				{ name: 'איידי של מקבל הבלאקליסט', value: String(id) },
				{ name: 'סיבה לקבלת הבלאקליסט', value: String(reason) },
				{ name: 'הוכחות', value: evidenceField }
			);

		const messageToEdit = evidence2Input && typeof evidence2Input === 'string' ? interaction.message : message;

		await messageToEdit.edit({
			embeds: [embed]
		});

		interaction.reply({
			content: 'Done',
			flags: MessageFlags.Ephemeral
		});

		const updatedTicket = {
			channelID: channel.id,
			ownerID: ownerId,
			messageId: message.id,
			name: String(nameResponse),
			blacklistId: id,
			reason: reason,
			evidence: evidence
		};

		if (evidence2Input && typeof evidence2Input === 'string') {
			updatedTicket.evidence2 = evidence2Input;
		} else if (ticket.evidence2 && typeof ticket.evidence2 === 'string') {
			updatedTicket.evidence2 = ticket.evidence2;
		}

		await db.set(`guild:${guild.id}:user:${ownerId}_ticket`, updatedTicket);
	}

	/**
	 * @param {import('discord.js').ModalSubmitInteraction} interaction
	 */
	parse(interaction) {
		if (!interaction.customId.includes('blacklistedit_')) return this.none();

		return this.some();
	}
}

module.exports = {
	ModalHandler
};
