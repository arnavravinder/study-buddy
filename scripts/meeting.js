import { StreamVideoClient } from '@stream-io/video-client';

const { createApp } = Vue;

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room') || 'default-room';
const userId = '111';
const userName = urlParams.get('name') || 'Guest';
const userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTExIn0.476VWtQYvFMW4Z3ahd8aXmXQ_VEmx5XvS3uZMYAIRDg';

createApp({
    data() {
        return {
            callStatus: 'Connecting...',
            isAudioEnabled: true,
            isVideoEnabled: true,
            isScreenSharing: false,
            streamClient: null,
            currentCall: null,
            participantCount: 0,
            hasRemoteVideo: false,
            userName: userName
        };
    },
    async mounted() {
        await this.initializeGetStream();
    },
    methods: {
        async initializeGetStream() {
            try {
                const apiKey = 'z4j6f2bay984';

                const user = {
                    id: userId,
                    name: userName,
                    image: 'https://getstream.io/random_png/?name=' + userName
                };

                this.streamClient = new StreamVideoClient({
                    apiKey: apiKey,
                    user: user,
                    token: userToken,
                });

                const call = this.streamClient.call('default', roomId);
                this.currentCall = call;

                await call.join({ create: true });
                this.callStatus = 'Connected';

                await call.camera.enable();
                await call.microphone.enable();

                this.renderVideoStreams(call);

                call.on('participantJoined', () => {
                    this.participantCount = call.state.remoteParticipants.length;
                    this.renderVideoStreams(call);
                });

                call.on('participantLeft', () => {
                    this.participantCount = call.state.remoteParticipants.length;
                    this.renderVideoStreams(call);
                });

                this.participantCount = call.state.remoteParticipants.length;

            } catch (error) {
                this.callStatus = 'Connection failed';
            }
        },
        renderVideoStreams(call) {
            const localVideoEl = document.getElementById('local-video');
            const remoteVideoEl = document.getElementById('remote-video');

            if (localVideoEl && call.camera.state.mediaStream) {
                const existingLabel = localVideoEl.querySelector('.local-video-label');
                const videos = localVideoEl.querySelectorAll('video');
                videos.forEach(v => v.remove());

                const video = document.createElement('video');
                video.srcObject = call.camera.state.mediaStream;
                video.autoplay = true;
                video.muted = true;
                video.playsInline = true;
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'cover';

                if (existingLabel) {
                    localVideoEl.insertBefore(video, existingLabel);
                } else {
                    localVideoEl.appendChild(video);
                }
            }

            if (remoteVideoEl) {
                remoteVideoEl.innerHTML = '';
                this.hasRemoteVideo = false;

                const remoteParticipants = Array.from(call.state.remoteParticipants || []);

                remoteParticipants.forEach(participant => {
                    const videoTrack = participant.publishedTracks.find(t => t.type === 'video');
                    if (videoTrack && participant.videoStream) {
                        this.hasRemoteVideo = true;
                        const video = document.createElement('video');
                        video.srcObject = participant.videoStream;
                        video.autoplay = true;
                        video.playsInline = true;
                        video.style.width = '100%';
                        video.style.height = '100%';
                        video.style.objectFit = 'cover';
                        remoteVideoEl.appendChild(video);
                    }
                });

                if (!this.hasRemoteVideo) {
                    const waitingDiv = document.createElement('div');
                    waitingDiv.className = 'waiting-state';
                    waitingDiv.innerHTML = '<div class="spinner"></div><p>Waiting for others to join...</p>';
                    remoteVideoEl.appendChild(waitingDiv);
                }
            }
        },
        async toggleAudio() {
            if (this.currentCall) {
                if (this.isAudioEnabled) {
                    await this.currentCall.microphone.disable();
                } else {
                    await this.currentCall.microphone.enable();
                }
                this.isAudioEnabled = !this.isAudioEnabled;
            }
        },
        async toggleVideo() {
            if (this.currentCall) {
                if (this.isVideoEnabled) {
                    await this.currentCall.camera.disable();
                } else {
                    await this.currentCall.camera.enable();
                }
                this.isVideoEnabled = !this.isVideoEnabled;
            }
        },
        async toggleScreenShare() {
            if (this.currentCall) {
                if (this.isScreenSharing) {
                    await this.currentCall.screenShare.disable();
                } else {
                    await this.currentCall.screenShare.enable();
                }
                this.isScreenSharing = !this.isScreenSharing;
            }
        },
        async leaveMeeting() {
            if (this.currentCall) {
                await this.currentCall.leave();
                this.currentCall = null;
            }
            if (this.streamClient) {
                await this.streamClient.disconnectUser();
                this.streamClient = null;
            }
            window.location.href = 'mentee-dashboard.html';
        }
    }
}).mount('#app');
