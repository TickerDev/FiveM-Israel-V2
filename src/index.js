require('./lib/setup');

const { LogLevel, SapphireClient } = require('@sapphire/framework');
const { prefix, discord_token, Mongo } = require('./config.json');
const { GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');
const { Database } = require('./custom/database');
const { connectToPrisma } = require('./prisma');
const { prisma } = require('./prisma');

const client = new SapphireClient({
	defaultPrefix: prefix,
	caseInsensitiveCommands: true,
	logger: {
		level: LogLevel.Debug
	},
	shards: 'auto',
	api: { automaticallyConnect: false },
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.AutoModerationExecution,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildMessageReactions
	],
	partials: [Partials.Channel, Partials.Message, Partials.Reaction],
	loadMessageCommandListeners: true
});
const { QuickDB } = require('quick.db');
const SeasonsSystem = require('./custom/seasons');
const seasonDB = new QuickDB({ table: 'seasons' });
const { Time } = require('@sapphire/time-utilities');
const seasons = new SeasonsSystem({
	client,
	categories: config.categories,
	resultChannelId: config.Seasons.resultChannel,
	db: seasonDB,
	seasonDurationMs: Time.Month * 2
});

module.exports.client = client;
module.exports.seasons = seasons;
const main = async () => {
	try {
		client.logger.info('Connecting to Prisma...');
		await connectToPrisma();
		client.logger.info('Connected to Prisma.');

		client.logger.info('Logging in...');
		await client.login(discord_token);
		client.logger.info('Logged in.');
		seasons.initialize();
	} catch (error) {
		client.logger.fatal(error);
		client.destroy();
		process.exit(1);
	}
};

client.config = config;
client.db = new Database();

global.db = client.db;
global.config = require('./config');
main();

process.on('unhandledRejection', (error) => {
	client.logger.error(error);
});
process.on('uncaughtException', (error) => {
	client.logger.error(error);
});
