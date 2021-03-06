const expect = require('expect');
const WalletProvider = require('truffle-wallet-provider');
const Wallet = require('ethereumjs-wallet');
const { promisify } = require('util');
const Eth = require('ethjs-query');

const ShortThingFactory = artifacts.require('./ShortThingFactory.sol');
const ThingFactory = artifacts.require('./ThingFactory.sol');
const Thing = artifacts.require('./Thing.sol');

contract('CloneFactory', (accounts) => {
  var global;
  var factory;

  const initFactory = async (contract) => {
    var _factory = await contract.new(global.address)
    factory = {
      cloneCost: () => {
        return _factory.onlyCreate().then(tx => tx.receipt.gasUsed)
      },
      createThing: (name, value) => {
        return _factory.createThing(name, value)
          .then(tx => {
            return Thing.at(tx.logs[0].args.newThingAddress);
          })
      }
    }
  };

  describe('Regular CloneFactory', () => {
    before(async () => {
      global = await Thing.new();
      await initFactory(ThingFactory);
    })

    it('should be cheap', () => {
      return factory.cloneCost()
        .then(cost => {
          console.log("Clone cost: " + cost);
          expect(+cost).toBeLessThan(70000)
        })
    })

    it('should work', () => {
      return factory.createThing("Fred", 233)
        .then(thing => {
          return Promise.resolve()
            .then(() => thing.value())
            .then(value => expect(+value).toBe(233))
            .then(() => thing.name())
            .then(name => expect(name).toBe('Fred'))
        })
        .then(() => global.name())
        .then(value => expect(value).toBe('master'))
        .then(() => global.value())
        .then(value => expect(+value).toBe(0));
    })
  });

  describe("ShortCloneFactory", () => {
    const cPrivateKey = 'c89bc66f8e5231642aa7120cb876819c48b539659cbda0b1516a92b6174be4e0';
    var eth;

    before(async () => {
      var wallet = Wallet.fromPrivateKey(new Buffer(cPrivateKey, 'hex'));
      eth = new Eth(Thing.currentProvider);
      await eth.sendTransaction({
        from: accounts[0],
        to: wallet.getAddressString(),
        value: 2e18,
        data: '0x'
      })
      var provider = new WalletProvider(wallet, Thing.currentProvider);
      Thing.setProvider(provider);
      global = await Thing.new({ from: wallet.getAddressString(), nonce: 0 })
      await initFactory(ShortThingFactory);
    })

    it('should be cheap', () => {
      return factory.cloneCost()
        .then(cost => {
          console.log("Clone cost: " + cost);
          expect(+cost).toBeLessThan(70000)
        })
    })

    it('should work', () => {
      return factory.createThing("Fred", 233)
        .then(thing => {
          return Promise.resolve()
            .then(() => thing.value())
            .then(value => expect(+value).toBe(233))
            .then(() => thing.name())
            .then(name => expect(name).toBe('Fred'))
        })
        .then(() => global.name())
        .then(value => expect(value).toBe('master'))
        .then(() => global.value())
        .then(value => expect(+value).toBe(0));
    })
  })
})