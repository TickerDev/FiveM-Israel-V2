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
	CommandInteraction
} = require('discord.js');
const Discord = require('discord.js');
class TicketAddButtonHandler extends InteractionHandler {
	constructor(ctx, options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button
		});
	}

	parse(interaction) {
		if (interaction.customId !== 'partnerships') return this.none();

		return this.some();
	}
	/**
	 *
	 * @param {CommandInteraction} interaction
	 * @returns
	 */
	async run(interaction) {
		await interaction.deferReply({ flags: Discord.MessageFlags.Ephemeral });

		await interaction.editReply({
			embeds: [
				new Discord.EmbedBuilder()
					.setTitle(`${config.serverName} | Partnerships`)
					.setDescription(
						`היי ושלום! אנו שמחים שאתם מעוניינים לעשות שיתוף פעולה עם ${config.serverName}!\nבגלל שינויים בפוליסות ובדרך בה אנחנו עובדים, מהיום פרטנרים יעברו באימיילים **בלבד**\nמה זה אומר?:\nמהיום תשלחו אימייל ל-partnerships@fivemisrael.org כדי לקבל תשובה על שיתופי פעולה!\n\n **שימו לב, שיתופי פעולה על מוצרים זולים כגון ניטרויים וכולי אינם מקובלים**\n\nתודה רבה והמשך שבוע נהדר!`
					)
					.setColor(config.embed_color)
			]
		});
	}
}
module.exports = {
	TicketAddButtonHandler
};
