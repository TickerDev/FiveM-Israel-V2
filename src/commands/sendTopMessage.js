const { Command } = require('@sapphire/framework');
const Discord = require('discord.js');
const config = require('../config');
class UserCommand extends Command {
	/**
	 * @param {Command.LoaderContext} context
	 */
	constructor(context) {
		super(context, {
			name: 'sendTopMessage',
			description: 'שלח הודעה לטופ הרשימה',
			preconditions: ['OwnerOnly']
		});
	}

	/**
	 * @param {import('discord.js').Message} message
	 */
	async messageRun(message) {
		const messageContent = `**ההכי טובים, ההכי מוצלחים, הטופ של הטופ 🏆
!לחצו על הכפתור למטה לצפייה בשרתים בטופ הרשימה בכל קטגוריה**`;
		await message.channel.send({
			embeds: [new Discord.EmbedBuilder().setTitle('שרתים בטופ הרשימה').setDescription(messageContent).setColor(Discord.Colors.Gold)],
			components: [
				new Discord.ActionRowBuilder().addComponents(
					new Discord.ButtonBuilder().setCustomId('top_servers').setLabel('🏆').setStyle(Discord.ButtonStyle.Primary)
				)
			]
		});
	}
}

module.exports = {
	UserCommand
};
