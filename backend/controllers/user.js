const User = require("../models/User");
const Post = require("../models/Post");
const { json } = require("express");


exports.register = async (req,res)=> {

    try{

        const {name,email,password} = req.body;
       

        let user = await User.findOne({email}); 
        if(user){
            return res
            .status(400)
            .json({ success:false , message: "user already exist"});
        } 

        user = await User.create({
            name,
            email,
            password,
            avatar: {public_id:"sample_id", url: "sampleurl"},
        });

       
        const token = await user.generateToken();

        const options = {
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            httpOnly: true,
        };

        res.status(200).cookie("token",token,options).json({
            success: true,
            user,
            token,
        });
        

    } catch (error) {
        res.status(500).json({
            success:false,
           
            message: error.message,
        });
    }
};


exports.login = async (req , res) => {
    try {

        const {email , password}  = req.body;
      

        const user =await User.findOne({ email }).select("+password");

        if(!user){
            return res.status(400).json({
                success: false,
                message: "user does not exist"
            })
        }

        const isMatch = await user.matchPassword(password);
        

        if (!isMatch) {
            return res.status(400).json({
                    success: false,
                    message: "incorrect password"
                
            });
        }

        const token = await user.generateToken();

        const options = {
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            httpOnly: true,
        };

        res.status(200).cookie("token",token,options).json({
            success: true,
            user,
            token,
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message,
        })

    }
};

exports.logout = async (req ,res ) => {
    try{
        res.status(200)
            .cookie("token",null,{expires:new Date(Date.now()), httpOnly:true})
            .json({
            success:true,
            message:" Logged Out",
        });
    }
    catch(error){
        res.status(500),json({
            success:false,
            message: error.message,
        });
    }
}


exports.followuser = async (req,res) => {
    try {
        
        const userToFollow = await User.findById(req.params.id);
        const loggedInUser = await User.findById(req.user._id);

        if(!userToFollow) {
            return res.status(404).json({
                success:false,
                message: "user not found"
            });
        }
        if(loggedInUser.following.includes(userToFollow._id)){

            const indexfollowing = loggedInUser.following.indexOf(userToFollow._id);
            loggedInUser.following.splice(indexfollowing);

            const indexfollower = userToFollow.follower.indexOf(loggedInUser._id);
            userToFollow.follower.splice(indexfollower,1);

            await loggedInUser.save();
            await userToFollow.save();

            res.status(200).json({
                success:true,
                message: " user unfollowed ",
            });

        }
        else{

                loggedInUser.following.push(userToFollow._id);
                userToFollow.follower.push(loggedInUser._id);
        
                await loggedInUser.save();
                await userToFollow.save();
        
                res.status(200).json({
                    success:true,
                    message: " user followed ",
                });
        }


    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.getPostOfFollowing = async (req,res) => {
    try {

        const user =await User.findById(req.user._id);

        const posts = await Post.find({
            owner: {
                $in: user.following,
            },
        }).populate("owner likes comments.user");

        res.status(200).json({
            success: true,
            posts:posts.reverse(),
        });

        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        })
    }
};

exports.updatePassword = async (req,res) => {
    try {

        const user = await User.findById(req.user._id).select("+password");

        const {oldPassword , newPassword } = req.body;

        if(!oldPassword || !newPassword){
            res.status(400).json({
                success:false,
                message:"give oldpassword and newpassword",
            })
        }

        const isMatch = await user.matchPassword(oldPassword);

        if(!isMatch){
            res.status(400).json({
                success: false,
                message: "incorrect old password",
            })
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password updated",
        });

        
    } catch (error) {
        res.status(500).json({
            success : false,
            message : error.message,
        })
    }
};

exports.updateProfile = async(req,res)=> {
    try {

        const user = await User.findById(req.user._id);

        const {name , email } = req.body;

        if(name){
            user.name = name;

        }
        if(email){
            user.email = email;
        }
        //user Avatar 

        await user.save();

        res.status(200).json({
            success: true,
            message: "profile updated",
        });


        
    } catch (error) {
        res.status(500).json({
            success : false,
            message : error.message,
        })
    }
};

exports.updateCaption = async (req,res) => {
    try {
        
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            })
        }

        if(post.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({
                success:false,
                message: "Unauthorized",
            });
        }

        post.caption = req.body.caption;
        await post.save();
        res.status(200).json({
            success:true,
            message: "Caption is Updated",
        })


    } catch (error) {
        res.status(500).json({
            success:false,
            message:error.message
        })
    }
};

exports.deleteMyProfile = async (req,res) => {
    try {
        const user = await User.findById(req.user._id);
        const posts = await user.posts;
        const followers = await user.follower;
        const followings = await user.following;
        const userId = user._id;

        await User.findByIdAndDelete(req.user._id);

        //logout user
        res.cookie("token",null,{expires:new Date(Date.now()), httpOnly:true});
        
        // delete all posts of deleted user
        for(let i = 0 ; i<posts.length ; i++) {
            const post = await Post.findByIdAndDelete(posts[i]);
        }

        //removing user_id from following's followers
        for(let i=0 ; i<followers.length; i++){
            const follower = await User.findById(followers[i]);
            const index = follower.following.indexOf(userId);
            follower.following.splice(index,1);
            await follower.save();

        }

        //removing user_id from follower's following
        for(let i=0 ; i<followings.length; i++){
            const follows = await User.findById(followings[i]);
            const index = follows.follower.indexOf(userId);
            follows.follower.splice(index,1);
            await follows.save();

        }

        res.status(200).json({
            success: true,
            message : "profile deleted",
        })

    } catch (error) {
        res.status(500).json({
            success:true,
            message: error.message,
        })
    }
};

exports.myProfile =  async (req,res) => {
    try {
        const user = await User.findById(req.user._id).populate("posts");

        res.status(200).json({
            success: true,
           user,
        })


    } catch (error) {
        res.status(500).json({
            success:true,
            message: error.message,
        })
        
    }
};

exports.getUserProfile = async (req,res) => {
    try {
        const user = await User.findById(req.params.id).populate("posts");

        if(!user){
            return res.status(404).json({
                success:false,
                message:"User Not Found",
            });
        }

        res.status(200).json({
            success: true,
           user,
        });
    } catch (error) {
        res.status(500).json({
            success:true,
            message: error.message,
        });
        
    }
};

exports.getAllUsers = async (req,res) => {
    try {
        const users = await User.find({});

        res.status(200).json({
            success:true,
            users,
        })
    } catch (error) {
        res.status(500).json({
            success:true,
            message: error.message,
        })
    }
}