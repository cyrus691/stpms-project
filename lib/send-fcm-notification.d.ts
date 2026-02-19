/* eslint-disable no-unused-vars */
declare module '@/lib/send-fcm-notification' {
  export function sendFcmNotification(
    _tokens: string[],
    _payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
    _options?: Record<string, any>
  ): Promise<any>;
}
