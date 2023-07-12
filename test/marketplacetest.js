const Dex=artifacts.require("Dex");
const Link=artifacts.require("Link");
const truffleAssert=require('truffle-assertions');

contract ("Dex",accounts=>{
    it("should throw an error if seller does not have enough tokens",async()=>{
        let dex=await Dex.deployed();
        
        let balance=await dex.balances(accounts[0],web3.utils.fromUtf8("LINK"));
        assert.equal(balance.toNumber(),0,"initial LINK balance not 0");
        
        await truffleAssert.reverts(
            dex.createMarketOrder(1,web3.utils.fromUtf8("LINK"),35)
        )      
    });
    it ("should throw an error if ETH balance is too low when creating BUY Market order",async()=>{
        let dex=await Dex.deployed();
        let link=await Link.deployed();

        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        await link.transfer(accounts[1],150);
        await link.approve(dex.address,50,{from:accounts[1]});
        await dex.deposit(50,web3.utils.fromUtf8("LINK"),{from:accounts[1]});
        let balanceLink=await link.balanceOf(accounts[1]);
        
        let balance = await dex.balances(accounts[4], web3.utils.fromUtf8("ETH"))
        assert.equal( balance.toNumber(), 0, "Initial ETH balance is not 0" );
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})

        await truffleAssert.reverts(
            dex.createMarketOrder(0,web3.utils.fromUtf8("LINK"),10,{from: accounts[4]})
        )
        
    });
    it("should allow marketorder to submit even if the orderbook is empty",async()=>{
        let dex=await Dex.deployed();
        await dex.depositEth({value:10000});

        let orderBook=await dex.getOrderBook(web3.utils.fromUtf8("LINK"),0);
        assert(orderBook.length==0,"Buy side orderbook not empty");
        console.log("orderbok heere"+orderBook);
        await truffleAssert.passes(
            dex.createMarketOrder(0,web3.utils.fromUtf8("LINK"),35)
        ) 
    });
    it("market order should not fill more limit orders than the market order amount",async()=>{
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)


        //Send LINK tokens to accounts 1, 2, 3 from account 0
        await link.transfer(accounts[1], 150)
        await link.transfer(accounts[2], 150)
        await link.transfer(accounts[3], 150)

        //Approve DEX for accounts 1, 2, 3
        await link.approve(dex.address, 50, {from: accounts[1]});
        await link.approve(dex.address, 50, {from: accounts[2]});
        await link.approve(dex.address, 50, {from: accounts[3]});

        //Deposit LINK into DEX for accounts 1, 2, 3
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[1]});
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[2]});
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[3]});

        //Fill up the sell order book
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 400, {from: accounts[2]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 500, {from: accounts[3]})

        //Create market order that should fill 2/3 orders in the book
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10);

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 1, "Sell side Orderbook should only have 1 order left");
//        assert(orderbook[0].filled == 0, "Sell side order should have 0 filled");

    });
    it("marketorder should be filled untill the orderbook is empty",async()=>{
        let dex=await Dex.deployed();
//        let link=await Link.deployed();
        await dex.depositEth({value: 50000});

        let orderBook=await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1);
        assert(orderBook.length==1, "sellside order book should have one order left");
        console.log("orderbook lengthhh"+orderBook.length)
        await dex.createLimitOrder(1,web3.utils.fromUtf8("LINK"),5,400,{from:accounts[1]});
        await dex.createLimitOrder(1,web3.utils.fromUtf8("LINK"),5,500,{from:accounts[2]});
        let balanceBefore=await dex.balances(accounts[0],web3.utils.fromUtf8("LINK"));
        //console.log("balanceBefore"+balanceBefore);
        await dex.createMarketOrder(0,web3.utils.fromUtf8("LINK"),50);
        let balanceAfter=await dex.balances(accounts[0],web3.utils.fromUtf8("LINK"));
        //console.log("balanceAfter"+balanceAfter);
        const balanceBeforeNumber = parseInt(balanceBefore, 10);
      const expectedBalance = balanceBeforeNumber + 15;

        assert.equal(expectedBalance.toString(),balanceAfter);

    });
    it("should check that the eth balance of the buyer decreases with filled amount",async()=>{
        let dex=await Dex.deployed();
        let link=await Link.deployed();
        await link.approve(dex.address,500,{from:accounts[1]});

        await dex.createLimitOrder(1,web3.utils.fromUtf8("LINK"),1,300,{from:accounts[1]});        
        
        let balanceBefore=await dex.balances(accounts[0],web3.utils.fromUtf8("ETH"));
        await dex.createMarketOrder(0,web3.utils.fromUtf8("LINK"),1);
        let balanceAfter= await dex.balances(accounts[0],web3.utils.fromUtf8("ETH"));
        
        assert.equal(balanceBefore-300,balanceAfter);
    });
    it("should check that the token balance of the seller decreases with filled amount",async()=>{
        let dex=await Dex.deployed();
        let link=await Link.deployed();
        await link.approve(dex.address,500,{from:accounts[2]});
        await dex.deposit(100,web3.utils.fromUtf8("LINK"),{from:accounts[2]});
        
        await dex.createLimitOrder(1,web3.utils.fromUtf8("LINK"),1,400,{from:accounts[1]});
        await dex.createLimitOrder(1,web3.utils.fromUtf8("LINK"),1,300,{from:accounts[2]});
        
        
        let balanceBeforeAccount1=await dex.balances(accounts[1],web3.utils.fromUtf8("LINK"));
        let balanceBeforeAccount2=await dex.balances(accounts[2],web3.utils.fromUtf8("LINK"));
        
        await dex.createMarketOrder(0,web3.utils.fromUtf8("LINK"),2);
        let balanceAfterAccount1= await dex.balances(accounts[1],web3.utils.fromUtf8("LINK"));
        let balanceAfterAccount2= await dex.balances(accounts[2],web3.utils.fromUtf8("LINK"));
        
        assert.equal(balanceBeforeAccount1-1,balanceAfterAccount1);
        assert.equal(balanceBeforeAccount2-1,balanceAfterAccount2);

    });
    it("filled orders should be removed from the orderlist", async()=>{
        let dex=await Dex.deployed();
        let link=await Link.deployed();
        
        let orderBook=await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1);
        assert(orderBook.length==0, "sellside order book should be empty");
        await dex.createLimitOrder(1,web3.utils.fromUtf8("LINK"),1,300,{from:accounts[1]});
        await dex.createMarketOrder(0,web3.utils.fromUtf8("LINK"),1);    
        orderBook=await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1);
        assert(orderBook.length==0, "sell side order book should be empty after trade");
    });
    
})