require('@sapphire/plugin-logger/register');
require('@sapphire/plugin-api/register');
require('@sapphire/plugin-editable-commands/register');
require('@sapphire/plugin-subcommands/register');

const { ApplicationCommandRegistries, RegisterBehavior, container } = require('@sapphire/framework');
const { createColors } = require('colorette');
const { inspect } = require('util');
const config = require('../config');

container.config = config;
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);
ApplicationCommandRegistries.setDefaultGuildIds([config.guildId]);
inspect.defaultOptions.depth = 1;

createColors({ useColor: true });
const { prisma } = require('../prisma');
container.prisma = prisma;
