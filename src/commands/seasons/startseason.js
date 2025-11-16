const { Command } = require('@sapphire/framework');
const { MessageFlags } = require('discord.js');
const Discord = require('discord.js');
const config = require('../../config');
const { seasons } = require('../../index');
class UserCommand extends Command {
	/**
	 * @param {Command.LoaderContext} context
	 */
	constructor(context) {
		super(context, {
			// Any Command options you want here
			name: 'start-season',
			description: '[ADMIN] חדש עונה חדשה'
		});
	}

	/**
	 * @param {Command.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
		);
	}

	/**
	 * @param {Command.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) return;
		await seasons.startSeason();
		interaction.reply({ content: `עונה ${await seasons.getCurrentSeasonNumber()} התחילה! הצבעות התאפסו`, flags: MessageFlags.Ephemeral });
		await this.container.client.db.resetGlobalVotes();
	}
}

module.exports = {
	UserCommand
};
