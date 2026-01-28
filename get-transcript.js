#!/usr/bin/env node

// Simple CLI tool to fetch transcripts
// Usage: node get-transcript.js <room-name>

const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function getTranscript(roomName) {
  try {
    console.log(`\n🔍 Fetching transcript for room: ${roomName}...\n`);

    const response = await axios.get(`${SERVER_URL}/api/transcripts/${roomName}`);

    if (response.data.success) {
      console.log('✅ Transcript found!\n');
      console.log('Recording ID:', response.data.recordingId);
      console.log('\n📝 TRANSCRIPT:\n');
      console.log(JSON.stringify(response.data.transcript, null, 2));
      console.log('\n');
      return response.data.transcript;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('❌ No recordings found for this room');
      console.error('   Make sure:');
      console.error('   1. The meeting was recorded');
      console.error('   2. Transcription was enabled (requires JWT with transcription feature)');
      console.error('   3. The recording has finished processing\n');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Backend server not running!');
      console.error('   Start it with: npm start\n');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    process.exit(1);
  }
}

async function listRecordings() {
  try {
    console.log('\n📋 Fetching all recordings...\n');

    const response = await axios.get(`${SERVER_URL}/api/recordings`);

    if (response.data.success && response.data.recordings.length > 0) {
      console.log(`Found ${response.data.recordings.length} recording(s):\n`);
      response.data.recordings.forEach((recording, index) => {
        console.log(`${index + 1}. Room: ${recording.roomName.split('/')[1]}`);
        console.log(`   ID: ${recording.id}`);
        console.log(`   Duration: ${recording.duration}s`);
        console.log(`   Created: ${new Date(recording.createdAt).toLocaleString()}\n`);
      });
    } else {
      console.log('No recordings found yet.\n');
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Backend server not running!');
      console.error('   Start it with: npm start\n');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--list') {
  listRecordings();
} else {
  const roomName = args[0];
  getTranscript(roomName);
}
