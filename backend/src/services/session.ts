interface SessionData {
    state: string;
    data: any;
}

class SessionService {
    private sessions: Map<string, SessionData> = new Map();

    getSession(userId: string): SessionData | undefined {
        return this.sessions.get(userId);
    }

    setSession(userId: string, state: string, data: any = {}) {
        this.sessions.set(userId, { state, data });
    }

    updateSessionData(userId: string, data: any) {
        const session = this.sessions.get(userId);
        if (session) {
            this.sessions.set(userId, { ...session, data: { ...session.data, ...data } });
        }
    }

    clearSession(userId: string) {
        this.sessions.delete(userId);
    }
}

export const sessionService = new SessionService();
