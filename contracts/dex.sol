// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./wallet.sol";
contract Dex is Wallet{
using SafeMath for uint256;
    enum Side {
        BUY,
        SELL
    }

    struct Order{
        uint id;
        address trader;
        Side side;
        uint amount;
        uint price;
        bytes32 ticker;
        uint filled;
    }
    uint nextOrderId=0;
    mapping(bytes32=>mapping(uint=>Order[])) public orderBook;
    function getOrderBook(bytes32 ticker, Side side) view public returns(Order[] memory){
        return orderBook[ticker][uint(side)];
    }
    
    function createLimitOrder(Side side,bytes32 ticker,uint amount,uint price) public{
        if(side==Side.BUY){
            require(balances[msg.sender]["ETH"]>=amount.mul(price),"ETH insufficient");
        }
        else if(side==Side.SELL){
            require(balances[msg.sender][ticker]>=amount,"tokens insufficient");
        }
        Order[] storage orders=orderBook[ticker][uint(side)];
        orders.push(
            Order(nextOrderId,msg.sender,side,amount,price,ticker,0)
        );
        //highest to lowest
        uint i= orders.length>0?orders.length-1:0;
        if(side==Side.BUY){
            while( i>0){
                if(orders[i].price<=orders[i-1].price){
                    break;
                }
                Order memory tempOrder=orders[i];
                orders[i]=orders[i-1];
                orders[i-1]=tempOrder;
                  i--;
            }
        }
        else if (side==Side.SELL){
            while( i>0){
                if(orders[i].price>=orders[i-1].price){
                    break;
                }
                Order memory tempOrder=orders[i];
                orders[i]=orders[i-1];
                orders[i-1]=tempOrder;
                i--;
            }
        }
        nextOrderId++;
    }
    function createMarketOrder(Side side,bytes32 ticker,uint amount) public{
    uint orderside;
        if(side==Side.BUY){
            orderside=1;
        }
        else{
            require(balances[msg.sender][ticker]>=amount,"Insufficient token");
            orderside=0;
        }
        uint amtTemp=amount;
        uint costEth;
        uint token;
        Order[] storage orders=orderBook[ticker][orderside];
        for(uint i=0;i<orders.length && amtTemp!=0 ;i++){
            
            if(orders[i].amount > amtTemp){
                orders[i].amount=orders[i].amount.sub(amtTemp);
                costEth=amtTemp.mul(orders[i].price);
                token=amtTemp;
                amtTemp=0;

            }
            else{
                amtTemp=amtTemp.sub(orders[i].amount);
                token=orders[i].amount;
                costEth=token.mul(orders[i].price);
                orders[i].amount=0;                
            }
            if(side==Side.SELL){
                balances[msg.sender]["ETH"]=balances[msg.sender]["ETH"].add(costEth);
                balances[orders[i].trader]["ETH"]=balances[orders[i].trader]["ETH"].sub(costEth);

                balances[orders[i].trader][ticker]=balances[orders[i].trader][ticker].add(token);
                balances[msg.sender][ticker]=balances[msg.sender][ticker].sub(token);
            }
            else{
                require(balances[msg.sender]["ETH"]>=costEth);
                balances[msg.sender]["ETH"]=balances[msg.sender]["ETH"].sub(costEth);
                balances[orders[i].trader]["ETH"]=balances[orders[i].trader]["ETH"].add(costEth);

                balances[orders[i].trader][ticker]=balances[orders[i].trader][ticker].sub(token);
                balances[msg.sender][ticker]=balances[msg.sender][ticker].add(token);      
            
            }
        }
        while ( orders.length>0 && orders[0].amount==0){
            for(uint j=0;j<orders.length-1;j++){
                orders[j]=orders[j+1];
            }
            orders.pop();
        }
    }       
}