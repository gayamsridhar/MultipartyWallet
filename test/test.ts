import { assert, expect } from "chai";
import { ethers } from "hardhat";

describe("MultipartyWallet", function () {

  let Admin;
  let UserOne: any;
  let UserTwo: any;
  let UserThree: any;
  let UserFour: any;
  let UserFive: any;
  let UserSix: any;
  let UserSeven: any;
  let MultipartyWallet;
  let multipartyWallet: any;
  const quorum = 60;


  beforeEach(async function () {
    [Admin,UserOne,UserTwo,UserThree,UserFour, UserFive, UserSix, UserSeven] = await ethers.getSigners();
     MultipartyWallet = await ethers.getContractFactory("MultipartyWallet");
     multipartyWallet = await MultipartyWallet.deploy(quorum);     
    await multipartyWallet.deployed();    
  });

  it("contract deployed", async function () {
    console.log("Contract deployed at : ", multipartyWallet.address);
    const Quorum = await multipartyWallet.quorum();
    console.log("Quorum is : ", Quorum.toNumber());
    expect(Quorum).to.equal(quorum);
  });

  it("Add a owner", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await multipartyWallet.addOwner(UserTwo.address);
    const A = await multipartyWallet.owners(UserOne.address);
    const B = await multipartyWallet.owners(UserTwo.address);
    
    expect(A).to.equal(true);
    expect(B).to.equal(true);
  });

  it("Owner already added ", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await expect(
      multipartyWallet.addOwner(UserOne.address)
    ).to.be.revertedWith("Already Added");
  });

  it("Add owner with non admin-user", async function () {
    await expect(
      multipartyWallet.connect(UserOne).addOwner(UserOne.address)
    ).to.be.revertedWith("only Admin");
  });

  it("Remove a owner", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await multipartyWallet.removeOwner(UserOne.address);  
    const A = await multipartyWallet.owners(UserOne.address);  
    expect(A).to.equal(false);

  });

  it("Not a owner to remove", async function () {
    await expect(
      multipartyWallet.removeOwner(UserOne.address)
    ).to.be.revertedWith("not a owner address");
  });

  it("Remove owner with non admin-user", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await expect(
      multipartyWallet.connect(UserOne).removeOwner(UserOne.address)
    ).to.be.revertedWith("only Admin");
  });

  it("Create Transaction with owner", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await multipartyWallet.addOwner(UserTwo.address);
    await multipartyWallet.addOwner(UserThree.address);
    await multipartyWallet.addOwner(UserFour.address);
    await multipartyWallet.addOwner(UserFive.address);
    await multipartyWallet.connect(UserOne).createTransaction();
    const nextId = await multipartyWallet.nextId();
    const transTotalQuorum = await multipartyWallet.getTransactionApprovalsRequired(nextId-1);
    console.log("Approvals required for Transaction-1 is : ", transTotalQuorum.toNumber());
    expect(nextId).to.equal(1);
    expect(transTotalQuorum).to.equal(3);
  });

  it("Create Transaction with non-owner", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await expect(
      multipartyWallet.connect(UserThree).createTransaction()
    ).to.be.revertedWith("only Approvers");
  });

  it("Approve transaction with other owners ", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await multipartyWallet.addOwner(UserTwo.address);
    await multipartyWallet.addOwner(UserThree.address);
    await multipartyWallet.addOwner(UserFour.address);
    await multipartyWallet.addOwner(UserFive.address);
    await multipartyWallet.connect(UserOne).createTransaction();
    const nextId = await multipartyWallet.nextId();
    await multipartyWallet.connect(UserTwo).approveTransaction(nextId-1);
    await multipartyWallet.connect(UserThree).approveTransaction(nextId-1);
    await multipartyWallet.connect(UserFour).approveTransaction(nextId-1);

    const transactionApprovalsReceived = await multipartyWallet.getTransactionApprovalsReceived(nextId-1);
    console.log("Transaction Approvals Received for Transaction-1 is : ", transactionApprovalsReceived.toNumber());
    expect(transactionApprovalsReceived).to.equal(3);
  });

  it("Approve transaction with created-by owner : Creater of transaction cannot approve ", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await multipartyWallet.addOwner(UserTwo.address);
    await multipartyWallet.addOwner(UserThree.address);
    await multipartyWallet.addOwner(UserFour.address);
    await multipartyWallet.addOwner(UserFive.address);
    await multipartyWallet.connect(UserOne).createTransaction();
    const nextId = await multipartyWallet.nextId();
    await expect(
      multipartyWallet.connect(UserOne).approveTransaction(nextId-1)
    ).to.be.revertedWith("Creater of transaction cannot approve");
  });

  it("Approve transaction with non-owner : only Approvers ", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await multipartyWallet.addOwner(UserTwo.address);
    await multipartyWallet.addOwner(UserThree.address);
    await multipartyWallet.addOwner(UserFour.address);
    await multipartyWallet.addOwner(UserFive.address);
    await multipartyWallet.connect(UserOne).createTransaction();
    const nextId = await multipartyWallet.nextId();
    await expect(
      multipartyWallet.connect(UserSix).approveTransaction(nextId-1)
    ).to.be.revertedWith("only Approvers");
  });

  it("Approve transaction with other owners : Transaction has been already cleared ", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await multipartyWallet.addOwner(UserTwo.address);
    await multipartyWallet.addOwner(UserThree.address);
    await multipartyWallet.addOwner(UserFour.address);
    await multipartyWallet.addOwner(UserFive.address);
    await multipartyWallet.connect(UserOne).createTransaction();
    const nextId = await multipartyWallet.nextId();
    await multipartyWallet.connect(UserTwo).approveTransaction(nextId-1);
    await multipartyWallet.connect(UserThree).approveTransaction(nextId-1);
    await multipartyWallet.connect(UserFour).approveTransaction(nextId-1);

    await multipartyWallet.connect(UserOne).executeTransaction(nextId-1);

    await expect(
      multipartyWallet.connect(UserFive).approveTransaction(nextId-1)
    ).to.be.revertedWith("Transaction has been already cleared");
  });

  it("Execute Transaction ", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await multipartyWallet.addOwner(UserTwo.address);
    await multipartyWallet.addOwner(UserThree.address);
    await multipartyWallet.addOwner(UserFour.address);
    await multipartyWallet.addOwner(UserFive.address);
    await multipartyWallet.connect(UserOne).createTransaction();
    const nextId = await multipartyWallet.nextId();
    await multipartyWallet.connect(UserTwo).approveTransaction(nextId-1);
    await multipartyWallet.connect(UserThree).approveTransaction(nextId-1);
    await multipartyWallet.connect(UserFour).approveTransaction(nextId-1);

    await multipartyWallet.connect(UserOne).executeTransaction(nextId-1);

    const cleared = await multipartyWallet.getTransactionStatus(nextId-1);
    expect(cleared).to.equal(true);
  });

  it("Execute Transaction: Transaction has been already cleared ", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await multipartyWallet.addOwner(UserTwo.address);
    await multipartyWallet.addOwner(UserThree.address);
    await multipartyWallet.addOwner(UserFour.address);
    await multipartyWallet.addOwner(UserFive.address);
    await multipartyWallet.connect(UserOne).createTransaction();
    const nextId = await multipartyWallet.nextId();
    await multipartyWallet.connect(UserTwo).approveTransaction(nextId-1);
    await multipartyWallet.connect(UserThree).approveTransaction(nextId-1);
    await multipartyWallet.connect(UserFour).approveTransaction(nextId-1);

    await multipartyWallet.connect(UserOne).executeTransaction(nextId-1);

    await expect(
      multipartyWallet.connect(UserOne).executeTransaction(nextId-1)
    ).to.be.revertedWith("Transaction has been already cleared");
  });

  it("Execute Transaction: Only Owner of transction can execute ", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await multipartyWallet.addOwner(UserTwo.address);
    await multipartyWallet.addOwner(UserThree.address);
    await multipartyWallet.addOwner(UserFour.address);
    await multipartyWallet.addOwner(UserFive.address);
    await multipartyWallet.connect(UserOne).createTransaction();
    const nextId = await multipartyWallet.nextId();
    await multipartyWallet.connect(UserTwo).approveTransaction(nextId-1);
    await multipartyWallet.connect(UserThree).approveTransaction(nextId-1);
    // await multipartyWallet.connect(UserFour).approveTransaction(nextId-1);

    await expect(
      multipartyWallet.connect(UserTwo).executeTransaction(nextId-1)
    ).to.be.revertedWith("Only Owner of transction can execute");
  });

  it("Execute Transaction: quorum has not reached ", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await multipartyWallet.addOwner(UserTwo.address);
    await multipartyWallet.addOwner(UserThree.address);
    await multipartyWallet.addOwner(UserFour.address);
    await multipartyWallet.addOwner(UserFive.address);
    await multipartyWallet.connect(UserOne).createTransaction();
    const nextId = await multipartyWallet.nextId();
    await multipartyWallet.connect(UserTwo).approveTransaction(nextId-1);
    await multipartyWallet.connect(UserThree).approveTransaction(nextId-1);
    // await multipartyWallet.connect(UserFour).approveTransaction(nextId-1);

    await expect(
      multipartyWallet.connect(UserOne).executeTransaction(nextId-1)
    ).to.be.revertedWith("quorum has not reached");
  });

  it("Update Contract Quorum ", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await multipartyWallet.addOwner(UserTwo.address);
    await multipartyWallet.addOwner(UserThree.address);
    await multipartyWallet.addOwner(UserFour.address);
    await multipartyWallet.addOwner(UserFive.address);

    await multipartyWallet.updateQuorum(40);

    await multipartyWallet.connect(UserOne).createTransaction();
    const nextId = await multipartyWallet.nextId();
    const transTotalQuorum = await multipartyWallet.getTransactionApprovalsRequired(nextId-1);
    console.log("Approvals required for Transaction-1 is : ", transTotalQuorum.toNumber());
    expect(transTotalQuorum).to.equal(2);
  });

  it("Update Transction Quorum ", async function () {
    await multipartyWallet.addOwner(UserOne.address);
    await multipartyWallet.addOwner(UserTwo.address);
    await multipartyWallet.addOwner(UserThree.address);
    await multipartyWallet.addOwner(UserFour.address);
    await multipartyWallet.addOwner(UserFive.address);
    await multipartyWallet.connect(UserOne).createTransaction();

    const nextId = await multipartyWallet.nextId();
    await multipartyWallet.connect(UserTwo).approveTransaction(nextId-1);
    await multipartyWallet.connect(UserThree).approveTransaction(nextId-1);
    
    const transTotalQuorum1 = await multipartyWallet.getTransactionApprovalsRequired(nextId-1);
    console.log("Approvals required for Transaction-1 is : ", transTotalQuorum1.toNumber());

    await expect(
      multipartyWallet.connect(UserOne).executeTransaction(nextId-1)
    ).to.be.revertedWith("quorum has not reached");

    await multipartyWallet.updateTransactionQuorum(nextId-1,40);

    const transTotalQuorum2 = await multipartyWallet.getTransactionApprovalsRequired(nextId-1);
    console.log("Approvals required for Transaction-1 after quorum update : ", transTotalQuorum2.toNumber());

    await multipartyWallet.connect(UserOne).executeTransaction(nextId-1);

    const cleared = await multipartyWallet.getTransactionStatus(nextId-1);
    expect(cleared).to.equal(true);
  });

});
