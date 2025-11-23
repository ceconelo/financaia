// Global state para controle do bot
export const botState = {
    connected: false,
    phoneNumber: null as string | null,
    qrCode: null as string | null,
    connectedAt: null as Date | null,
    isReconnecting: false,
};
