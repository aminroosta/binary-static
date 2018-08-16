import { observer }     from 'mobx-react';
import PropTypes        from 'prop-types';
import React            from 'react';
import ContractSell     from '../../Containers/contract_sell.jsx';
import Money            from '../../../../App/Components/Elements/money.jsx';
import RemainingTime    from '../../../../App/Containers/remaining_time.jsx';
import {
    getIndicativePrice,
    isEnded,
    isStarted }         from '../../../../Stores/Modules/Contract/Helpers/logic';
import { localize }     from '../../../../../_common/localize';

const InfoBoxGeneral = ({ contract_info }) => {
    const {
        buy_price,
        currency,
        date_expiry,
        profit,
    } = contract_info;

    const indicative_price = getIndicativePrice(contract_info);
    const is_started       = isStarted(contract_info);
    const is_ended         = isEnded(contract_info);

    return (
        <div className='general'>
            <div>
                <div>{localize('Purchase Price')}</div>
                <div>{localize('Indicative Price')}</div>
                <div>{localize('Profit/Loss')}</div>
            </div>
            <div className='values'>
                <div>
                    <Money amount={buy_price} currency={currency} />
                </div>
                <div>
                    <Money amount={indicative_price} currency={currency} />
                </div>
                <div className={profit >= 0 ? 'profit' : 'loss'}>
                    <Money amount={profit} currency={currency} has_sign />
                </div>
            </div>
            { !is_ended &&
                <div>
                    <div>{localize('Remaining Time')}</div>
                    <strong>
                        {is_started && date_expiry ?
                            <RemainingTime end_time={date_expiry}/>
                            :
                            '-'
                        }
                    </strong>
                </div>
            }
            <ContractSell />
        </div>
    );
};

InfoBoxGeneral.propTypes = {
    contract_info: PropTypes.object,
    onClickSell  : PropTypes.func,
};

export default observer(InfoBoxGeneral);
