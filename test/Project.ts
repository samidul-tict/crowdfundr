import { expect } from "chai";
import { ethers } from "hardhat";
import { Project } from "../typechain/";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("CrowdFundRaise", function () {

  let proj: Project;
  let sami: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let ana: SignerWithAddress;
  let response;

  this.beforeAll(async function() {

    [sami, alice, bob, ana] = await ethers.getSigners();
    const Project = await ethers.getContractFactory("Project");
    const proj = await Project.connect(sami).deploy(
      sami.address,
      100000000000000000000,
      30,
      10000000000000000,
      1000000000000000000,
      "Sam's NFT",
      "SAMI");
    await proj.deployed();
    console.log("contract address: ", proj.address);
  });

  it("contribute to a project", async function () {

    response = await proj.connect(alice).contribute({value: ethers.utils.parseEther("1.0")});

    const tx = {
      to: proj.address,
      value: ethers.utils.parseEther("1.0")
    }
    
    await bob.sendTransaction(tx);

    // try to donate to a cancelled project
    await proj.connect(sami).cancelProject();
    response = await proj.connect(alice).contribute({value: ethers.utils.parseEther("1.0")});
  });

  it("cancel a project", async function () {

    // try to cancel by someone other than the admin
    await proj.connect(alice).cancelProject();

    await proj.connect(sami).cancelProject();

    // try to cancel a fulfilled project
    response = await proj.connect(alice).contribute({value: ethers.utils.parseEther("100.0")});
    await proj.connect(sami).cancelProject();
  });

  it("toggle project status", async function () {

    // try to toggle status by someone other than the admin
    await proj.connect(alice).toggleProjectStatus();

    await proj.connect(sami).toggleProjectStatus();

    // toggle status of a fulfilled project
    response = await proj.connect(alice).contribute({value: ethers.utils.parseEther("100.0")});
    await proj.connect(sami).toggleProjectStatus();

    // toggle status of a cancelled project
    await proj.connect(sami).cancelProject();
    await proj.connect(sami).toggleProjectStatus();
  });

  it("refund a contributor", async function () {

    // get refund from a cancelled project
    await proj.connect(sami).cancelProject();
    response = await proj.connect(alice).refundContributor();
    console.log("refund to alice: ", response);

    // try to get refund when not a contributor
    response = await proj.connect(ana).refundContributor();
    console.log("refund to ana: ", response);

    // get refund from an active project
    response = await proj.connect(alice).refundContributor();
    console.log("refund to alice: ", response);

    // get refund from an onhold project
    await proj.connect(sami).toggleProjectStatus();
    response = await proj.connect(alice).refundContributor();
    console.log("refund to alice: ", response);
  });

  it("create spending request", async function () {
    
    // create spending request by someone other than admin
    response = await proj.connect(alice).createSpendingRequest(ana.address, 100000000000000000000, "sending to Ana");

    response = await proj.connect(sami).createSpendingRequest(ana.address, 100000000000000000000, "sending to Ana");
    console.log("created spending request: ", response);
  });

  it("vote for a spending request", async function () {

    response = await proj.connect(sami).createSpendingRequest(ana.address, 100000000000000000000, "sending to Ana");

    // try to vote when not a contributor
    response = await proj.connect(ana).vote(response._requestID, true);

    response = await proj.connect(alice).vote(response._requestID, true);
    response = await proj.connect(bob).vote(response._requestID, false);
  });

  it("pay money to an approved spending request", async function () {

    response = await proj.connect(sami).createSpendingRequest(ana.address, 100000000000000000000, "sending to Ana");

    // try to pay money to the receipient by someone other than the admin
    response = await proj.connect(alice).contribute({value: ethers.utils.parseEther("100.0")});
    response = await proj.connect(alice).payMoney(response._requestID);

    // try to pay money to the receipient by someone other than the admin during fulfilled stage
    response = await proj.connect(alice).contribute({value: ethers.utils.parseEther("100.0")});
    response = await proj.connect(alice).payMoney(response._requestID);

    // try to pay money to the receipient by the admin during fulfilled stage
    response = await proj.connect(sami).contribute({value: ethers.utils.parseEther("100.0")});
    response = await proj.connect(sami).payMoney(response._requestID);

    // try to re-pay money to the same receipient by the admin during fulfilled stage
    response = await proj.connect(sami).contribute({value: ethers.utils.parseEther("100.0")});
    response = await proj.connect(sami).payMoney(response._requestID);

    // try again now
    response = await proj.connect(sami).payMoney(response._requestID);
  });

});
