import { Wallet } from '@models/wallet';
import { Contact } from '@models/contact';

export class Profile {
  contacts: any = {};
  name: string;
  networkId: string;
  wallets: any = {};

  deserialize(input: any): Profile {
    this.reset();
    let self: any = this;

    for (let prop in input) {
      self[prop] = input[prop];
    }
    return self;
  }

  reset() {
    this.contacts = {};
    this.name = null;
    this.networkId = null;
    this.wallets = {};
  }
}

