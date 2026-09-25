import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import type { Logger, ProviderSendNotificationDTO, ProviderSendNotificationResultsDTO } from "@medusajs/framework/types"
import { renderEmail } from "./templates"

type Options = {
  serverToken: string
  from: string
  messageStream?: string
}

/** Sends transactional email through Postmark's HTTP API. */
export default class PostmarkNotificationService extends AbstractNotificationProviderService {
  static identifier = "postmark"

  protected options_: Options
  protected logger_: Logger

  constructor({ logger }: { logger: Logger }, options: Options) {
    super()
    this.options_ = options
    this.logger_ = logger
  }

  static validateOptions(options: Record<string, unknown>) {
    if (!options.serverToken) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Postmark: serverToken is required")
    }
    if (!options.from) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Postmark: from is required")
    }
  }

  async send(notification: ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    const { subject, html, text } = renderEmail(notification.template, notification.data ?? {})

    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": this.options_.serverToken,
      },
      body: JSON.stringify({
        From: notification.from || this.options_.from,
        To: notification.to,
        Subject: subject,
        HtmlBody: html,
        TextBody: text,
        MessageStream: this.options_.messageStream ?? "outbound",
        Tag: notification.template,
      }),
    })

    const body = (await res.json().catch(() => ({}))) as { MessageID?: string; Message?: string; ErrorCode?: number }
    if (!res.ok || body.ErrorCode) {
      this.logger_.error(`[postmark] ${notification.template} to ${notification.to} failed: ${body.Message ?? res.status}`)
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Postmark: ${body.Message ?? res.statusText}`)
    }
    this.logger_.info(`[postmark] sent ${notification.template} to ${notification.to}`)
    return { id: body.MessageID }
  }
}
