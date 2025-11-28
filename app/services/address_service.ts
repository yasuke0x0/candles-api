import User from '#models/user'
import Address from '#models/address'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class AddressService {
  /**
   * Helper to Find an existing address or Create a new one.
   * This prevents duplicate rows in the address book.
   */
  public async findOrCreateAddress(
    user: User,
    data: any,
    type: 'SHIPPING' | 'BILLING',
    trx: TransactionClientContract
  ) {
    // 1. Search for an exact match for this user
    const existingAddress = await Address.query({ client: trx })
      .where('user_id', user.id)
      .andWhere('type', type)
      .andWhere('street_address_line_one', data.address) // Map frontend 'address' to DB 'street_address_line_one'
      .andWhere('city', data.city)
      .andWhere('postal_code', data.zip) // Map frontend 'zip' to DB 'postal_code'
      .andWhere('country', data.country)
      .first()

    if (existingAddress) {
      return existingAddress
    }

    // 2. If not found, create a new one
    return await Address.create(
      {
        userId: user.id,
        type: type,
        streetAddressLineOne: data.address,
        streetAddressLineTwo: data.streetAddressLineTwo,
        city: data.city,
        postalCode: data.zip,
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        country: data.country,
      },
      { client: trx }
    )
  }
}
