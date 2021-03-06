const BinaryPjax   = require('../../../../base/binary_pjax');
const BinarySocket = require('../../../../base/socket');
const FormManager  = require('../../../../common/form_manager');
const localize     = require('../../../../../_common/localize').localize;

const CashierPassword = (() => {
    const form_id = '#frm_cashier_password';

    let should_redirect = false;

    let $form;

    const onLoad = () => {
        $form = $(form_id);

        BinarySocket.wait('authorize').then(() => {
            BinarySocket.send({ cashier_password: 1 }).then(response => init(response));
        });
    };

    const updatePage = (config) => {
        $('legend').text(localize(config.legend));
        $('#lockInfo').text(localize(config.info));
        $form.find('button').html(localize(config.button));
    };

    const init = (response) => {
        const locked = response.cashier_password;
        if (locked) {
            updatePage({
                legend: 'Unlock Cashier',
                info  : 'Your cashier is locked as per your request - to unlock it, please enter the password.',
                button: 'Unlock Cashier',
            });
            $('#repeat_password_row').setVisibility(0);
        } else {
            updatePage({
                legend: 'Lock Cashier',
                info  : 'An additional password can be used to restrict access to the cashier.',
                button: 'Update',
            });
            $('#repeat_password_row').setVisibility(1);
        }
        $form.setVisibility(1);
        FormManager.init(form_id, [
            { selector: '#cashier_password',        validations: ['req', locked ? ['length', { min: 6, max: 25 }] : 'password'], request_field: locked ? 'unlock_password' : 'lock_password', re_check_field: locked ? null : '#repeat_cashier_password' },
            { selector: '#repeat_cashier_password', validations: ['req', ['compare', { to: '#cashier_password' }]], exclude_request: 1 },

            { request_field: 'cashier_password', value: 1 },
        ]);
        FormManager.handleSubmit({
            form_selector       : form_id,
            fnc_response_handler: handleResponse,
        });
    };

    const handleResponse = (response) => {
        const $form_error   = $('#form_error');
        const $form_message = $('#form_message');
        $form_message.text('');
        $form_error.setVisibility(0);
        if (response.error) {
            let message = response.error.message;
            if (response.error.code === 'InputValidationFailed') {
                message = 'Sorry, you have entered an incorrect cashier password';
            }
            $form_error.text(localize(message)).setVisibility(1);
            return;
        }
        $form.setVisibility(0);
        $form_message.text(localize('Your settings have been updated successfully.'));
        setTimeout(redirect, 2000);
    };

    const redirect = () => {
        if (should_redirect) {
            should_redirect = false;
            BinaryPjax.loadPreviousUrl();
        }
    };

    return {
        onLoad,

        setShouldRedirect: (bool) => { should_redirect = bool; },
    };
})();

module.exports = CashierPassword;
