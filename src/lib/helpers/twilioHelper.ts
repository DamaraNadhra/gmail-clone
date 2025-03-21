import twilio from "twilio";

export class TwillioHelper {
  private client: twilio.Twilio;

  constructor(
    private accountSid: string,
    private authToken: string,
  ) {
    this.client = twilio(accountSid, authToken);
  }

  async sendSms(to: string, message: string) {
    try {
      const response = await this.client.messages.create({
        body: message,
        from: "+18587860950",
        to: to, // The phone number you want to send the SMS to
      });
      console.log("SMS sent:", response.sid);
    } catch (error) {
      console.error("Error sending SMS:", error);
    }
  }
}