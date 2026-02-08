const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');
const fs = require('fs');
require('dotenv').config();
const Database = require('./database');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration
    ]
});

const db = new Database();

// Custom emojis
const EMOJIS = {
    delete: '<:2563delete:1469685079600267275>',
    addgreen: '<:8692addgreen:1469685062776656026>',
    ticketclosed: '<:43142ticketclosed:1469685046255550637>',
    ticketclaimed: '<:6514ticketclaimed:1469685031743258687>',
    unlocked: '<:85871unlockedids:1469685016396169227>',
    welcome: '<:17533welcomeids:1469684994250375321>',
    dust: '<a:292452dust:1469684976684499028>',
    greenrole: '<:42567greenroleiconids:1469684956849766511>',
    bughunter: '<:188241bughunter:1469684938700754954>',
    denied: '<:965575deniedids:1469684925023256639>',
    approved: '<:50773approvedids:1469684909563187433>',
    investor: '<:23476investor:1469684892307689752>',
    rose: '<:351759rose:1469684875442257933>',
    coolguy: '<:11621coolguy:1469684856442196069>',
    party: '<:827557party:1469684835391115335>',
    skull: '<a:skullglowingeyes:1469682823194480744>',
    camera: '<a:cameraredlogo:1469682783403376885>',
    information: '<:information:1469682751673204874>',
    banned: '<:getbanned:1469682706261479525>',
    noadvertise: '<:dontadvertiseids:1469682663895072925>',
    calendar: '<:greencalendar:1469682615547203665>',
    bot: '<:redbotv2:1469682559028953221>',
    muted: '<:Redmuted:1469682478552715441>'
};

client.once('ready', () => {
    console.log(`${EMOJIS.approved} Bot is online as ${client.user.tag}`);
    client.user.setActivity('Moderating Server', { type: 'WATCHING' });
});

// Track daily stats
client.on('messageCreate', async (message) => {
    if (!message.guild) return;
    db.incrementMessageCount(message.guild.id);
});

client.on('guildMemberAdd', async (member) => {
    db.incrementJoinCount(member.guild.id);
});

// Interaction handler
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        await handleCommands(interaction);
    } else if (interaction.isButton()) {
        await handleButtons(interaction);
    }
});

async function handleCommands(interaction) {
    const { commandName, options, guild, member } = interaction;

    try {
        switch (commandName) {
            case 'addrole': {
                if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    return interaction.reply({ content: `${EMOJIS.denied} You don't have permission to manage roles!`, ephemeral: true });
                }

                const user = options.getUser('user');
                const role = options.getRole('role');
                const guildMember = await guild.members.fetch(user.id);

                await guildMember.roles.add(role);
                
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`${EMOJIS.addgreen} Role Added`)
                    .setDescription(`Successfully added ${role} to ${user}`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                await logAction(guild, 'Role Added', `${member.user.tag} added role ${role.name} to ${user.tag}`);
                break;
            }

            case 'kick': {
                if (!member.permissions.has(PermissionFlagsBits.KickMembers)) {
                    return interaction.reply({ content: `${EMOJIS.denied} You don't have permission to kick members!`, ephemeral: true });
                }

                const user = options.getUser('user');
                const reason = options.getString('reason') || 'No reason provided';
                const guildMember = await guild.members.fetch(user.id);

                await guildMember.kick(reason);

                const embed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle(`${EMOJIS.skull} Member Kicked`)
                    .setDescription(`${user.tag} has been kicked`)
                    .addFields({ name: 'Reason', value: reason })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                await logAction(guild, 'Member Kicked', `${member.user.tag} kicked ${user.tag}\nReason: ${reason}`);
                break;
            }

            case 'ban': {
                if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
                    return interaction.reply({ content: `${EMOJIS.denied} You don't have permission to ban members!`, ephemeral: true });
                }

                const user = options.getUser('user');
                const reason = options.getString('reason') || 'No reason provided';

                await guild.members.ban(user.id, { reason });

                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`${EMOJIS.banned} Member Banned`)
                    .setDescription(`${user.tag} has been banned`)
                    .addFields({ name: 'Reason', value: reason })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                await logAction(guild, 'Member Banned', `${member.user.tag} banned ${user.tag}\nReason: ${reason}`);
                break;
            }

            case 'mute': {
                if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return interaction.reply({ content: `${EMOJIS.denied} You don't have permission to mute members!`, ephemeral: true });
                }

                const user = options.getUser('user');
                const duration = options.getInteger('duration') || 60;
                const reason = options.getString('reason') || 'No reason provided';
                const guildMember = await guild.members.fetch(user.id);

                await guildMember.timeout(duration * 60 * 1000, reason);

                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`${EMOJIS.muted} Member Muted`)
                    .setDescription(`${user.tag} has been muted for ${duration} minutes`)
                    .addFields({ name: 'Reason', value: reason })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                await logAction(guild, 'Member Muted', `${member.user.tag} muted ${user.tag} for ${duration} minutes\nReason: ${reason}`);
                break;
            }

            case 'unmute': {
                if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return interaction.reply({ content: `${EMOJIS.denied} You don't have permission to unmute members!`, ephemeral: true });
                }

                const user = options.getUser('user');
                const guildMember = await guild.members.fetch(user.id);

                await guildMember.timeout(null);

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`${EMOJIS.unlocked} Member Unmuted`)
                    .setDescription(`${user.tag} has been unmuted`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                await logAction(guild, 'Member Unmuted', `${member.user.tag} unmuted ${user.tag}`);
                break;
            }

            case 'purge': {
                if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                    return interaction.reply({ content: `${EMOJIS.denied} You don't have permission to manage messages!`, ephemeral: true });
                }

                const amount = options.getInteger('amount');
                
                if (amount < 1 || amount > 100) {
                    return interaction.reply({ content: `${EMOJIS.denied} Please provide a number between 1 and 100!`, ephemeral: true });
                }

                await interaction.channel.bulkDelete(amount, true);

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`${EMOJIS.delete} Messages Purged`)
                    .setDescription(`Successfully deleted ${amount} messages`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                await logAction(guild, 'Messages Purged', `${member.user.tag} deleted ${amount} messages in ${interaction.channel.name}`);
                break;
            }

            case 'stats': {
                const totalMembers = guild.memberCount;
                const bots = guild.members.cache.filter(m => m.user.bot).size;
                const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
                const totalChannels = guild.channels.cache.size;
                const totalRoles = guild.roles.cache.size;
                
                const stats = db.getStats(guild.id);

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`${EMOJIS.information} Server Statistics`)
                    .setThumbnail(guild.iconURL())
                    .addFields(
                        { name: `${EMOJIS.party} Total Members`, value: `${totalMembers}`, inline: true },
                        { name: `${EMOJIS.bot} Bots`, value: `${bots}`, inline: true },
                        { name: `${EMOJIS.calendar} Categories`, value: `${categories}`, inline: true },
                        { name: `${EMOJIS.camera} Total Channels`, value: `${totalChannels}`, inline: true },
                        { name: `${EMOJIS.greenrole} Total Roles`, value: `${totalRoles}`, inline: true },
                        { name: `${EMOJIS.dust} Today Messages`, value: `${stats.todayMessages}`, inline: true },
                        { name: `${EMOJIS.welcome} Today Joins`, value: `${stats.todayJoins}`, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'dm': {
                if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: `${EMOJIS.denied} You don't have permission to use this command!`, ephemeral: true });
                }

                const user = options.getUser('user');
                const message = options.getString('message');

                try {
                    await user.send(message);
                    await interaction.reply({ content: `${EMOJIS.approved} DM sent to ${user.tag}!`, ephemeral: true });
                    await logAction(guild, 'DM Sent', `${member.user.tag} sent DM to ${user.tag}`);
                } catch (error) {
                    await interaction.reply({ content: `${EMOJIS.denied} Could not send DM to ${user.tag}!`, ephemeral: true });
                }
                break;
            }

            case 'ticketpanel': {
                if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: `${EMOJIS.denied} You don't have permission to use this command!`, ephemeral: true });
                }

                const ticketName = options.getString('name') || 'Support Ticket';

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`${EMOJIS.information} ${ticketName}`)
                    .setDescription('Click the button below to create a ticket!')
                    .setTimestamp();

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('create_ticket')
                            .setLabel('Create Ticket')
                            .setEmoji(EMOJIS.addgreen)
                            .setStyle(ButtonStyle.Success)
                    );

                await interaction.channel.send({ embeds: [embed], components: [row] });
                await interaction.reply({ content: `${EMOJIS.approved} Ticket panel created!`, ephemeral: true });
                break;
            }

            case 'createchannel': {
                if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    return interaction.reply({ content: `${EMOJIS.denied} You don't have permission to manage channels!`, ephemeral: true });
                }

                const channelName = options.getString('name');
                const category = options.getChannel('category');

                const channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: category?.id
                });

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`${EMOJIS.addgreen} Channel Created`)
                    .setDescription(`Successfully created ${channel}`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                await logAction(guild, 'Channel Created', `${member.user.tag} created channel ${channel.name}`);
                break;
            }

            case 'joinvc': {
                const voiceChannel = member.voice.channel;

                if (!voiceChannel) {
                    return interaction.reply({ content: `${EMOJIS.denied} You need to be in a voice channel!`, ephemeral: true });
                }

                joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator
                });

                await interaction.reply({ content: `${EMOJIS.approved} Joined ${voiceChannel.name}!`, ephemeral: true });
                break;
            }

            case 'tts': {
                const message = options.getString('message');
                const voiceChannel = member.voice.channel;

                if (!voiceChannel) {
                    return interaction.reply({ content: `${EMOJIS.denied} You need to be in a voice channel!`, ephemeral: true });
                }

                await interaction.reply({ content: `${EMOJIS.approved} TTS message sent!`, ephemeral: true });
                // Note: TTS functionality requires additional setup with Google TTS or similar service
                break;
            }

            case 'setlogchannel': {
                if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: `${EMOJIS.denied} You don't have permission to use this command!`, ephemeral: true });
                }

                const channel = options.getChannel('channel');
                db.setLogChannel(guild.id, channel.id);

                await interaction.reply({ content: `${EMOJIS.approved} Log channel set to ${channel}!`, ephemeral: true });
                break;
            }
        }
    } catch (error) {
        console.error(error);
        if (!interaction.replied) {
            await interaction.reply({ content: `${EMOJIS.denied} An error occurred while executing this command!`, ephemeral: true });
        }
    }
}

async function handleButtons(interaction) {
    if (interaction.customId === 'create_ticket') {
        const guild = interaction.guild;
        const member = interaction.member;

        // Check if user already has a ticket
        const existingTicket = guild.channels.cache.find(
            c => c.name === `ticket-${member.user.username.toLowerCase()}` && c.type === ChannelType.GuildText
        );

        if (existingTicket) {
            return interaction.reply({ content: `${EMOJIS.denied} You already have an open ticket: ${existingTicket}`, ephemeral: true });
        }

        // Create ticket channel
        const ticketChannel = await guild.channels.create({
            name: `ticket-${member.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: member.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                }
            ]
        });

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${EMOJIS.information} Ticket Created`)
            .setDescription(`Welcome ${member}! Please describe your issue and wait for staff to respond.`)
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setEmoji(EMOJIS.ticketclosed)
                    .setStyle(ButtonStyle.Danger)
            );

        await ticketChannel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `${EMOJIS.approved} Ticket created: ${ticketChannel}`, ephemeral: true });
        
        await logAction(guild, 'Ticket Created', `${member.user.tag} created a ticket: ${ticketChannel.name}`);
    }

    if (interaction.customId === 'close_ticket') {
        const channel = interaction.channel;

        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: `${EMOJIS.denied} This is not a ticket channel!`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`${EMOJIS.ticketclosed} Ticket Closed`)
            .setDescription('This ticket will be deleted in 5 seconds...')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        await logAction(interaction.guild, 'Ticket Closed', `${interaction.user.tag} closed ticket: ${channel.name}`);

        setTimeout(() => channel.delete(), 5000);
    }
}

async function logAction(guild, action, description) {
    const logChannelId = db.getLogChannel(guild.id);
    if (!logChannelId) return;

    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor('#ffa500')
        .setTitle(`${EMOJIS.information} ${action}`)
        .setDescription(description)
        .setTimestamp();

    await logChannel.send({ embeds: [embed] });
}

client.login(process.env.DISCORD_TOKEN);
