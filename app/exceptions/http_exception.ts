import { Exception } from '@adonisjs/core/exceptions'
import { HttpContext } from '@adonisjs/core/http'

// Define the shape of the input object
type HttpExceptionOptions = {
  message: string
  status?: number
  code?: string
}

export default class HttpException extends Exception {
  public code?: string
  public status: number

  // Update constructor to accept the object
  constructor(options: HttpExceptionOptions) {
    const status = options.status ?? 500

    // Pass the extracted values to the parent Exception class
    super(options.message, { status, code: options.code })

    this.code = options.code
    this.status = status
  }

  /**
   * Handle the exception and return a JSON response
   */
  async handle(error: this, ctx: HttpContext) {
    const response: any = {
      message: error.message,
      status: error.status,
    }

    // Only include code if it was provided
    if (error.code) {
      response.code = error.code
    }

    ctx.response.status(error.status).send(response)
  }
}
