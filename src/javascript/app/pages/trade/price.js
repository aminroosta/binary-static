const moment               = require('moment');
const commonTrading        = require('./common');
const displayPriceMovement = require('./common_independent').displayPriceMovement;
const getStartDateNode     = require('./common_independent').getStartDateNode;
const getTradingTimes      = require('./common_independent').getTradingTimes;
const Contract             = require('./contract');
const Defaults             = require('./defaults');
const BinarySocket         = require('../../base/socket');
const formatMoney          = require('../../common/currency').formatMoney;
const elementInnerHtml     = require('../../../_common/common_functions').elementInnerHtml;
const elementTextContent   = require('../../../_common/common_functions').elementTextContent;
const isVisible            = require('../../../_common/common_functions').isVisible;
const localize             = require('../../../_common/localize').localize;
const getPropertyValue     = require('../../../_common/utility').getPropertyValue;

/*
 * Price object handles all the functions we need to display prices
 *
 * We create Price proposal that we need to send to server to get price,
 * longcode and all other information that we need to get the price for
 * current contract
 *
 *
 * Usage:
 *
 * `socket.send(Price.proposal())` to send price proposal to sever
 * `Price.display()` to display the price details returned from server
 */
const Price = (() => {
    let type_display_id_mapping = {};
    let form_id                 = 0;

    const createProposal = (type_of_contract) => {
        const proposal = {
            proposal : 1,
            subscribe: 1,
        };

        const contract_type = type_of_contract;
        const start_date    = getStartDateNode();
        const start_time    = document.getElementById('time_start');
        const underlying    = document.getElementById('underlying');
        const amount_type   = document.getElementById('amount_type');
        const currency      = document.getElementById('currency');
        const payout        = document.getElementById('amount');
        const expiry_type   = document.getElementById('expiry_type');
        const duration      = document.getElementById('duration_amount');
        const duration_unit = document.getElementById('duration_units');
        const end_date      = document.getElementById('expiry_date');
        const barrier       = document.getElementById('barrier');
        const high_barrier  = document.getElementById('barrier_high');
        const low_barrier   = document.getElementById('barrier_low');
        const prediction    = document.getElementById('prediction');

        if (payout && isVisible(payout) && payout.value) {
            proposal.amount = parseFloat(payout.value);
        }

        if (amount_type && isVisible(amount_type) && amount_type.value) {
            proposal.basis = amount_type.value;
        }

        if (contract_type) {
            proposal.contract_type = type_of_contract;
        }

        if (currency && (currency.value || currency.getAttribute('value'))) {
            proposal.currency = currency.value || currency.getAttribute('value');
        }

        if (underlying && underlying.value) {
            proposal.symbol = underlying.value;
        }

        if (start_date && isVisible(start_date) && start_date.value !== 'now') {
            const time = start_time.value.split(':');

            proposal.date_start = moment.utc(Number(start_date.value) * 1000).hour(time[0]).minute(time[1]).unix();
        }

        if (expiry_type && isVisible(expiry_type) && expiry_type.value === 'duration') {
            proposal.duration      = parseInt(duration.value);
            proposal.duration_unit = duration_unit.value;
        } else if (expiry_type && isVisible(expiry_type) && expiry_type.value === 'endtime') {
            const end_date2 = end_date.getAttribute('data-value');
            let end_time2   = Defaults.get('expiry_time');
            if (!end_time2) {
                const trading_times = getTradingTimes();
                const trading_times_end_date2 = getPropertyValue(trading_times, [end_date2, underlying.value]);
                if (trading_times_end_date2 && trading_times_end_date2.length && trading_times_end_date2[0] !== '--') {
                    if (trading_times_end_date2.length > 1) {
                        end_time2 = trading_times_end_date2[1];
                    } else {
                        end_time2 = trading_times_end_date2;
                    }
                }
            }

            proposal.date_expiry   = moment.utc(`${end_date2} ${(end_time2 || '23:59:59')}`).unix();
            // For stopping tick trade behaviour
            proposal.duration_unit = 'm';
        }

        if (barrier && isVisible(barrier) && barrier.value) {
            proposal.barrier = barrier.value;
        }

        if (high_barrier && isVisible(high_barrier) && high_barrier.value) {
            proposal.barrier = high_barrier.value;
        }

        if (low_barrier && isVisible(low_barrier) && low_barrier.value) {
            proposal.barrier2 = low_barrier.value;
        }

        if (prediction && isVisible(prediction)) {
            proposal.barrier = parseInt(prediction.value);
        }

        if (contract_type) {
            proposal.contract_type = type_of_contract;
        }

        proposal.passthrough = {
            form_id,
        };

        commonTrading.resetPriceMovement();

        return proposal;
    };

    const display = (details, contract_type) => {
        const proposal = details.proposal;
        const id       = proposal ? proposal.id : '';
        const params   = details.echo_req;

        let type = params.contract_type;
        if (id && !type) {
            type = type_display_id_mapping[id];
        }

        if (params && id && Object.getOwnPropertyNames(params).length > 0) {
            type_display_id_mapping[id] = type;
        }

        const position = commonTrading.contractTypeDisplayMapping(type);

        if (!position) {
            return;
        }

        const container = document.getElementById(`price_container_${position}`);
        if (!container) return;
        if (!$(container).is(':visible')) {
            $(container).fadeIn(200);
        }

        const h4            = container.getElementsByClassName('contract_heading')[0];
        const amount        = container.getElementsByClassName('contract_amount')[0];
        const payout_amount = container.getElementsByClassName('contract_payout')[0];
        const stake         = container.getElementsByClassName('stake')[0];
        const payout        = container.getElementsByClassName('payout')[0];
        const purchase      = container.getElementsByClassName('purchase_button')[0];
        const description   = container.getElementsByClassName('contract_description')[0];
        const comment       = container.getElementsByClassName('price_comment')[0];
        const error         = container.getElementsByClassName('contract_error')[0];
        const currency      = document.getElementById('currency');

        const display_text = type && contract_type ? contract_type[type] : '';
        if (display_text) {
            h4.setAttribute('class', `contract_heading ${type}`);
            elementTextContent(h4, display_text);
        }

        const setData = (data = {}) => {
            if (!data.display_value) {
                amount.classList.remove('price_moved_up', 'price_moved_down');
            }
            elementTextContent(stake, `${localize('Stake')}: `);
            elementInnerHtml(amount, data.display_value ? formatMoney((currency.value || currency.getAttribute('value')), data.display_value) : '-');

            if (!data.payout) {
                amount.classList.remove('price_moved_up', 'price_moved_down');
            }
            elementTextContent(payout, `${localize('Payout')}: `);
            elementInnerHtml(payout_amount, data.payout ? formatMoney((currency.value || currency.getAttribute('value')), data.payout) : '-');

            if (data.longcode && window.innerWidth > 500) {
                description.setAttribute('data-balloon', data.longcode);
            } else {
                description.removeAttribute('data-balloon');
            }
        };

        const setPurchaseStatus = (enable) => {
            purchase.parentNode.classList[enable ? 'remove' : 'add']('button-disabled');
        };

        if (details.error) {
            setPurchaseStatus(0);
            comment.hide();
            setData();
            error.show();
            elementTextContent(error, details.error.message);
        } else {
            setData(proposal);
            if ($('#websocket_form').find('.error-field:visible').length > 0) {
                setPurchaseStatus(0);
            } else {
                setPurchaseStatus(1);
            }
            comment.show();
            error.hide();
            commonTrading.displayCommentPrice(comment, (currency.value || currency.getAttribute('value')), proposal.ask_price, proposal.payout);
            const old_price  = purchase.getAttribute('data-display_value');
            const old_payout = purchase.getAttribute('data-payout');
            displayPriceMovement(amount, old_price, proposal.display_value);
            displayPriceMovement(payout_amount, old_payout, proposal.payout);
            purchase.setAttribute('data-purchase-id', id);
            purchase.setAttribute('data-ask-price', proposal.ask_price);
            purchase.setAttribute('data-display_value', proposal.display_value);
            purchase.setAttribute('data-payout', proposal.payout);
            purchase.setAttribute('data-symbol', id);
            Object.keys(params).forEach((key) => {
                if (key && key !== 'proposal') {
                    purchase.setAttribute(`data-${key}`, params[key]);
                }
            });
        }
    };

    const clearMapping = () => {
        type_display_id_mapping = {};
    };

    const clearFormId = () => {
        form_id = 0;
    };

    /*
     * Function to request for cancelling the current price proposal
     */
    const processForgetProposals = () => {
        commonTrading.showPriceOverlay();
        const forget_proposal = BinarySocket.send({
            forget_all: 'proposal',
        });
        forget_proposal.then(() => {
            Price.clearMapping();
        });
        return forget_proposal;
    };

    /*
     * Function to process and calculate price based on current form
     * parameters or change in form parameters
     */
    const processPriceRequest = () => {
        Price.incrFormId();
        commonTrading.showPriceOverlay();
        let types = Contract.contractType()[Contract.form()];
        if (Contract.form() === 'digits') {
            switch (sessionStorage.getItem('formname')) {
                case 'matchdiff':
                    types = {
                        DIGITMATCH: 1,
                        DIGITDIFF : 1,
                    };
                    break;
                case 'evenodd':
                    types = {
                        DIGITEVEN: 1,
                        DIGITODD : 1,
                    };
                    break;
                case 'overunder':
                    types = {
                        DIGITOVER : 1,
                        DIGITUNDER: 1,
                    };
                    break;
                default:
                    break;
            }
        }
        processForgetProposals().then(() => {
            Object.keys(types).forEach((type_of_contract) => {
                BinarySocket.send(Price.proposal(type_of_contract), { callback: (response) => {
                    if (response.echo_req && response.echo_req !== null && response.echo_req.passthrough &&
                        response.echo_req.passthrough.form_id === form_id) {
                        commonTrading.hideOverlayContainer();
                        Price.display(response, Contract.contractType()[Contract.form()]);
                        commonTrading.hidePriceOverlay();
                    }
                } });
            });
        });
    };

    return {
        display,
        clearMapping,
        clearFormId,
        processForgetProposals,
        processPriceRequest,

        proposal        : createProposal,
        idDisplayMapping: () => type_display_id_mapping,
        incrFormId      : () => { form_id++; },
    };
})();

module.exports = Price;
