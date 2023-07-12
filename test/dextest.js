//price of both buy and sell should be non zero
//amount should be non zero
//sell orders should be listed from highest to lowest in terms of price
//buyer seller address should be nonzero

const Dex=artifacts.require("Dex");
const Link=artifacts.require("Link");
const truffleAssert=require('truffle-assertions');

contract.skip ("Dex",accounts=>{
    it ("should throw an error if ETH balance is too low when creating BUY LIMIT order",async()=>{
        let dex=await Dex.deployed();
        let link=await Link.deployed();
        await truffleAssert.reverts(
            dex.createLimitOrder(0,web3.utils.fromUtf8("LINK"),10,1,{gas:3000000})
        )
        await dex.depositEth({value:2000});
        await truffleAssert.passes(
            dex.createLimitOrder(0,web3.utils.fromUtf8("LINK"),10,1,{gas:3000000})
        )
    });
    it ("should throw an error if token balance is too low when creating SELL LIMIT order",async()=>{
        let dex=await Dex.deployed();
        let link=await Link.deployed();
        await truffleAssert.reverts(
            dex.createLimitOrder(1,web3.utils.fromUtf8("LINK"),10,1,{gas:3000000})
        )
        await link.approve(dex.address,500);
        await dex.addToken(web3.utils.fromUtf8("LINK"),link.address,{from:accounts[0]});
        await dex.deposit(10,web3.utils.fromUtf8("LINK"));
        await truffleAssert.passes(
            dex.createLimitOrder(1,web3.utils.fromUtf8("LINK"),10,1,{gas:3000000})
        )
    });
    it("the BUY orderbook should be arranged from highest to lowest", async()=>{
        let dex=await Dex.deployed();
        let link=await Link.deployed();
        await dex.depositEth({value:3000});
        await dex.createLimitOrder(0,web3.utils.fromUtf8("LINK"),1,300,{gas:3000000});
        await dex.createLimitOrder(0,web3.utils.fromUtf8("LINK"),1,100,{gas:3000000});
        await dex.createLimitOrder(0,web3.utils.fromUtf8("LINK"),1,200,{gas:3000000});
        let orderbook=await dex.getOrderBook(web3.utils.fromUtf8("LINK"),0,{gas:3000000});
        console.log(orderbook);
        for(let i=0;i<orderbook.length-1;i++ ){
            assert((orderbook[i].price>=orderbook[i+1].price),"not correctly ordered buy book");
        }
    });
    it("the SELL orderbook should be arranged from lowest to highest", async()=>{
        let dex=await Dex.deployed();
        let link=await Link.deployed();
        await link.approve(dex.address,500);
        await dex.addToken(web3.utils.fromUtf8("LINK"),link.address,{from:accounts[0]});
        await dex.deposit(10,web3.utils.fromUtf8("LINK"));
        await dex.createLimitOrder(1,web3.utils.fromUtf8("LINK"),1,300,{gas:3000000});
        await dex.createLimitOrder(1,web3.utils.fromUtf8("LINK"),1,100,{gas:3000000});
        await dex.createLimitOrder(1,web3.utils.fromUtf8("LINK"),1,200,{gas:3000000});
        let orderbook=await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1,{gas:3000000});
        console.log(orderbook);
        for(let i=0;i<orderbook.length-1;i++ ){
            assert((orderbook[i].price<=orderbook[i+1].price),"not correctly ordered SELL book");
        }
    });
})
