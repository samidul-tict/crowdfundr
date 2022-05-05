import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { Project } from "../typechain/";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { eventNames } from "process";

describe("Project", function () {

  let proj: Project;
  let sami: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let ana: SignerWithAddress;
  let response;

  this.beforeEach(async function() {

    [sami, alice, bob, ana] = await ethers.getSigners();
    const Project = await ethers.getContractFactory("Project");
    proj = (await Project.connect(sami).deploy(
      sami.address,
      ethers.utils.parseEther("100.0"),
      30,
      ethers.utils.parseEther("0.01"),
      ethers.utils.parseEther("1.0"),
      "Sam's NFT",
      "SAMI")) as Project;
    await proj.deployed();
    console.log("contract address: ", proj.address);
  });

  it("contribute below minimum amount to an active project", async function () {

    await expect(proj.connect(alice).contribute({value: ethers.utils.parseEther("0.0001")}))
    .to.be.revertedWith("give minimum fund");
  });

  it("contribute to an active project", async function () {

    await proj.connect(alice).contribute({value: ethers.utils.parseEther("1.0")});

    const tx = {
      to: proj.address,
      value: ethers.utils.parseEther("1.0")
    }
    
    await bob.sendTransaction(tx);
  });

  it("contribute to a cancelled project", async function () {

    // try to donate to a cancelled project
    await proj.connect(sami).cancelProject();
    await expect(proj.connect(alice).contribute({value: ethers.utils.parseEther("1.0")}))
    .to.be.revertedWith("not an active project");
  });

  it("contribute to a fulfilled project", async function () {

    await proj.connect(alice).contribute({value: ethers.utils.parseEther("101.0")});
    await expect(proj.connect(bob).contribute({value: ethers.utils.parseEther("1.0")}))
    .to.be.revertedWith("not an active project");
  });

  it("contribute to a hold project", async function () {

    await proj.connect(sami).toggleProjectStatus();
    await expect(proj.connect(bob).contribute({value: ethers.utils.parseEther("1.0")}))
    .to.be.revertedWith("not an active project");
  });

  it("cancel a fulfilled project", async function () {

    response = await proj.connect(alice).contribute({value: ethers.utils.parseEther("101.0")});
    await expect(proj.connect(sami).cancelProject()).to.be.revertedWith("fulfilled project cannot be cancelled");
  });

  it("cancel a project by admin", async function () {

    await proj.connect(sami).cancelProject();
  });

  it("cancel a project by other than admin", async function () {

    await expect(proj.connect(alice).cancelProject()).to.be.revertedWith("not a valid admin");
  });

  it("toggle a project status by admin", async function () {

    await proj.connect(sami).toggleProjectStatus();
    await proj.connect(sami).toggleProjectStatus();
  });

  it("toggle a project status by someone other than the admin", async function () {

    await expect(proj.connect(alice).toggleProjectStatus()).to.be.revertedWith("not a valid admin");
  });

  it("toggle project status which is neither active nor on-hold", async function () {

    response = await proj.connect(alice).contribute({value: ethers.utils.parseEther("101.0")});
    await expect(proj.connect(sami).toggleProjectStatus())
    .to.be.revertedWith("project should be in active/ onhold status");
  });

  it("get refund from a cancelled project by a contributor", async function () {

    await proj.connect(alice).contribute({value: ethers.utils.parseEther("1.0")});
    await proj.connect(sami).cancelProject();
    await proj.connect(alice).refundContributor();
    response = await proj.getTotalContribution(alice.address);
    expect(response).to.equal(0);
  });

  it("get refund from a cancelled project by a non-contributor", async function () {

    await proj.connect(alice).contribute({value: ethers.utils.parseEther("1.0")});
    await proj.connect(sami).cancelProject();
    await expect(proj.connect(ana).refundContributor()).to.be.revertedWith("does not have enough balance");
  });

  it("get refund from an active project by a contributor", async function () {

    await proj.connect(alice).contribute({value: ethers.utils.parseEther("1.0")});
    await expect(proj.connect(alice).refundContributor()).to.be.revertedWith("not ready to refund");
  });

  it("create spending request by admin", async function () {
    
    await proj.connect(sami).createSpendingRequest(ana.address, ethers.utils.parseEther("10.0"), "sending to Ana");
  });

  it("create spending request by someone other than admin", async function () {
    
    await expect(proj.connect(alice).createSpendingRequest(ana.address, ethers.utils.parseEther("10.0"), "sending to Ana"))
    .to.be.revertedWith("not a valid admin");
  });

  describe("Vote", function () {

    let requestID: BigNumber;

    this.beforeEach(async function() {

      const unresolvedReceipt = await proj.connect(sami).createSpendingRequest(ana.address, ethers.utils.parseEther("10.0"), "sending to Ana");
      const resolvedReceipt = await unresolvedReceipt.wait();
      const event = resolvedReceipt.events?.find(event => event.event === "CreateSpendingRequest");
      requestID = event?.args?.slice().pop();
      //console.log(requestID);
      await proj.connect(alice).contribute({value: ethers.utils.parseEther("1.0")});
      await proj.connect(bob).contribute({value: ethers.utils.parseEther("1.0")});
    });

    it("vote for a spending request as a contributor", async function () {

      await proj.connect(alice).vote(requestID, true);
      await proj.connect(bob).vote(requestID, false);
    });

    it("vote for a spending request as a non-contributor", async function () {

      await expect(proj.connect(ana).vote(requestID, true)).to.be.revertedWith("not a contributor");
    });

    it("vote for a paid spending request as a contributor", async function () {

      await proj.connect(alice).vote(requestID, true);
      await proj.connect(bob).vote(requestID, true);
      await proj.connect(alice).contribute({value: ethers.utils.parseEther("101.0")});
      await proj.connect(sami).payMoney(requestID);
      await expect(proj.connect(alice).vote(requestID, true)).to.be.revertedWith("already paid");
    });
  });

  describe.only("pay money", function () {

    let requestID: BigNumber;

    this.beforeEach(async function() {

      const unresolvedReceipt = await proj.connect(sami).createSpendingRequest(ana.address, ethers.utils.parseEther("10.0"), "sending to Ana");
      const resolvedReceipt = await unresolvedReceipt.wait();
      const event = resolvedReceipt.events?.find(event => event.event === "CreateSpendingRequest");
      requestID = event?.args?.slice().pop();
      await proj.connect(alice).contribute({value: ethers.utils.parseEther("1.0")});
      await proj.connect(bob).contribute({value: ethers.utils.parseEther("1.0")});
      await proj.connect(ana).contribute({value: ethers.utils.parseEther("1.0")});
    });

    it("pay money by admin", async function () {

      await proj.connect(alice).vote(requestID, true);
      await proj.connect(bob).vote(requestID, true);
      await proj.connect(alice).contribute({value: ethers.utils.parseEther("101.0")});
      await proj.connect(sami).payMoney(requestID);
    });

    it("pay money by someone other than admin", async function () {

      await proj.connect(alice).vote(requestID, true);
      await proj.connect(bob).vote(requestID, true);
      await proj.connect(alice).contribute({value: ethers.utils.parseEther("101.0")});
      await expect(proj.connect(alice).payMoney(requestID)).to.be.revertedWith("not a valid admin");
    });

    it("an attempt by admin to spend the money for the second time", async function () {

      await proj.connect(alice).vote(requestID, true);
      await proj.connect(bob).vote(requestID, true);
      await proj.connect(alice).contribute({value: ethers.utils.parseEther("101.0")});
      await proj.connect(sami).payMoney(requestID);
      console.log("paid for the first time");
      await expect(proj.connect(sami).payMoney(requestID)).to.be.revertedWith("already paid");
    });

    it("an attempt by admin to spend the money when status != fulfilled", async function () {

      await proj.connect(alice).vote(requestID, true);
      await proj.connect(bob).vote(requestID, true);
      await expect(proj.connect(sami).payMoney(requestID)).to.be.revertedWith("not yet fulfilled");
    });

    it("an attempt by admin to spend the money when quoram has not reached", async function () {

      await proj.connect(alice).vote(requestID, false);
      await proj.connect(bob).vote(requestID, false);
      await proj.connect(alice).contribute({value: ethers.utils.parseEther("101.0")});
      await expect(proj.connect(sami).payMoney(requestID)).to.be.revertedWith("majority did not agree");
    });
  });

});
