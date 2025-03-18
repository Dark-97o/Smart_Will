module MyModule::SmartWill {

    use aptos_framework::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    struct Will has key, store {
        beneficiary: address,
        amount: u64,
    }

    public fun create_will(owner: &signer, beneficiary: address, amount: u64) {
        let will = Will {
            beneficiary,
            amount,
        };
        move_to(owner, will);
    }

    public entry fun claim_inheritance(beneficiary: &signer, owner_address: address) acquires Will {
        let will = borrow_global<Will>(owner_address);
        assert!(signer::address_of(beneficiary) == will.beneficiary, 1);
        
        // We need to remove the Will resource to get the funds
        let Will { beneficiary: _, amount } = move_from<Will>(owner_address);
        
        // Transfer funds directly without storing the beneficiary address
        coin::transfer<AptosCoin>(beneficiary, owner_address, amount);
    }
}
