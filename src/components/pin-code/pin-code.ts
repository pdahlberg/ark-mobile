import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ModalController, NavController, LoadingController, Loading } from 'ionic-angular';
import { Wallet, WalletKeys } from '@models/model';
import { AuthProvider } from '@providers/auth/auth';
import { UserDataProvider } from '@providers/user-data/user-data';
import { ToastProvider } from '@providers/toast/toast';

import lodash from 'lodash';

@Component({
  selector: 'pin-code',
  templateUrl: 'pin-code.html'
})
export class PinCodeComponent {

  @Input('wallet') wallet: Wallet;

  @Output('onSuccess') onSuccess: EventEmitter<WalletKeys> = new EventEmitter();
  @Output('onWrong') onWrong: EventEmitter<void> = new EventEmitter();

  private loader: Loading;

  constructor(
    private userDataProvider: UserDataProvider,
    private authProvider: AuthProvider,
    private toastProvider: ToastProvider,
    private modalCtrl: ModalController,
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
  ) {
  }

  open(message: string, outputPassword: boolean, verifySecondPassphrase: boolean = false) {
    if (outputPassword && !this.wallet) return false;

    let modal = this.modalCtrl.create('PinCodeModal', {
      message,
      outputPassword,
      validatePassword: true,
    });

    modal.onDidDismiss((password) => {
      if (lodash.isNil(password)) return this.onWrong.emit();

      let loader = this.loadingCtrl.create({
        dismissOnPageChange: true,
        enableBackdropDismiss: false,
        showBackdrop: true
      });

      loader.present();

      if (!outputPassword) {
        loader.dismiss();
        return this.onSuccess.emit();
      }

      let passphrases = this.userDataProvider.getKeysByWallet(this.wallet, password);
      loader.dismiss();

      if (lodash.isEmpty(passphrases) || lodash.isNil(passphrases)) return this.onWrong.emit();

      if (verifySecondPassphrase) return this.requestSecondPassphrase(passphrases);

      return this.onSuccess.emit(passphrases);
    });

    modal.present();
  }

  private requestSecondPassphrase(passphrases: WalletKeys) {
    if (this.wallet.secondSignature && !this.wallet.cipherSecondKey) {
      let modal = this.modalCtrl.create('EnterSecondPassphraseModal', null, { cssClass: 'inset-modal' });

      modal.onDidDismiss((passphrase) => {
        if (!passphrase) {
          this.toastProvider.error('TRANSACTIONS_PAGE.SECOND_PASSPHRASE_NOT_ENTERED');
          return this.onWrong.emit();
        }

        passphrases.secondPassphrase = passphrase;
        this.onSuccess.emit(passphrases);
      });

      modal.present();
    } else {
      this.onSuccess.emit(passphrases);
    }
  }

  createUpdatePinCode(nextPage?: string, oldPassword?: string) {
    let createModal = (master?: any) => {
      if (!master) {
        let createModal = this.modalCtrl.create('PinCodeModal', {
          message: 'PIN_CODE.CREATE',
          outputPassword: true,
        });

        createModal.onDidDismiss((password) => {
          if (password) {
            let validateModal = this.modalCtrl.create('PinCodeModal', {
              message: 'PIN_CODE.CONFIRM',
              expectedPassword: password,
            });

            validateModal.onDidDismiss((status) => {
              if (status) {
                this.authProvider.saveMasterPassword(password);
                if (oldPassword) {
                  this.userDataProvider.updateWalletEncryption(oldPassword, password);
                }
                this.toastProvider.success(oldPassword ? 'PIN_CODE.PIN_UPDATED_TEXT' : 'PIN_CODE.PIN_CREATED_TEXT');
                if (nextPage) {
                  this.navCtrl.push(nextPage);
                }
              } else {
                this.toastProvider.error(oldPassword ? 'PIN_CODE.PIN_UPDATED_ERROR_TEXT' : 'PIN_CODE.PIN_CREATED_ERROR_TEXT');
              }
            })

            validateModal.present();
          } else {
            this.toastProvider.error(oldPassword ? 'PIN_CODE.PIN_UPDATED_ERROR_TEXT' : 'PIN_CODE.PIN_CREATED_ERROR_TEXT');
          }
        });

        createModal.present();
      } else if (nextPage) {
        this.navCtrl.push(nextPage);
      }
    }
    if (!oldPassword) {
      this.authProvider.getMasterPassword().do(createModal).subscribe();
    } else {
      createModal();
    }
  }

}
